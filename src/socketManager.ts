import socketio, { Server, Socket } from "socket.io";
import http from "http";
import { errors } from "./config/errors.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import env from "./env.js";
import { db } from "./db.js";
import { User } from "@prisma/client";
import { userModel } from "./models/user.js";

interface ServerToClientEvents {
  message: (from: string, message: any) => void;
  groups: (groups: string[]) => void;
}

interface ClientToServerEvents {
  message: (
    to: string,
    content: string,
    ack: (status: boolean, message: any) => void
  ) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  user: User;
}

class SocketManager {
  public static io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >;

  static setupMiddlewares() {
    this.io.use(async (socket, next) => {
      const authHeader = socket.handshake.headers.authorization;
      if (!authHeader) {
        return next(errors.invalidAuth);
      }

      const token = authHeader.split(" ")[1];
      if (!token) {
        return next(errors.invalidAuth);
      }

      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        const user = await db.user.findUnique({ where: { id: decoded.sub } });
        if (!user) {
          return next(errors.invalidAuth);
        }
        if (!user.tokenIds.includes(decoded.jti!)) {
          throw errors.invalidAuth;
        }
        socket.data.user = user;
        return next();
      } catch (err) {
        return next(errors.invalidAuth);
      }
    });
  }

  static setupListeners() {
    this.io.on("connection", async (socket) => {
      console.log("a user connected", socket.id, socket.data.user.id);

      //get groups that use is in
      const userId = socket.data.user.id;
      const groups =
        socket.data.user.type === "ADMIN"
          ? await db.group.findMany()
          : await db.group.findMany({
              where: { members: { some: { id: userId } } },
            });
      socket.join(groups.map((g) => g.id));
      socket.emit(
        "groups",
        groups.map((g) => g.id)
      );

      socket.on("disconnect", () => {
        console.log("user disconnected");
      });

      socket.on("message", async (to, message, ack) => {
        console.log("message", to, message);
        const userId = socket.data.user.id;
        //check if user is in group
        const toGroup = await db.group.findUnique({
          where: { id: to },
          include: { members: true },
        });

        if (!toGroup) {
          ack(false, "Group not found");
          return;
        }

        //if not admin or not in group
        if (
          !toGroup.members.some((m) => m.id === userId) &&
          socket.data.user.type !== "ADMIN"
        ) {
          ack(false, "Not allowed to send here");
          return;
        }

        const newMessage = await db.message.create({
          data: {
            senderId: userId,
            groupId: toGroup.id,
            content: message,
          },
          include: { sender: true },
        });

        const obj = {
          ...newMessage,
          sender: userModel(newMessage.sender),
        };

        console.log(
          "sending to",
          (await this.io.in(toGroup.id).fetchSockets()).map((s) => s.id)
        );
        this.io.to(obj.groupId).emit("message", to, obj);
        ack(true, obj);
      });
    });
  }

  static init(httpServer: http.Server) {
    if (!this.io) {
      this.io = new Server(httpServer, {
        cors: {
          origin: "*",
        },
      });
      this.setupMiddlewares();
      this.setupListeners();
    }
  }
}

export { SocketManager };
