import socketio, { Server, Socket } from "socket.io";
import http from "http";
import { errors } from "./config/errors.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import env from "./env.js";
import { db } from "./db.js";
import { User } from "@prisma/client";

interface ServerToClientEvents {
  message: (from: string, message: any) => void;
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
        next();
      } catch (err) {
        return next(errors.invalidAuth);
      }

      next();
    });
  }

  static setupListeners() {
    this.io.on("connection", async (socket) => {
      console.log("connection", socket.request);
      console.log("a user connected");

      //get groups that use is in
      const userId = socket.data.user.id;
      const group = await db.group.findMany({
        where: { members: { some: { id: userId } } },
      });
      group.forEach((g) => {
        socket.join(g.id);
      });

      socket.on("disconnect", () => {
        console.log("user disconnected");
      });

      //join groups

      socket.on("message", async (to, message, ack) => {
        const userId = socket.data.user.id;
        //check if user is in group
        const toGroup = await db.group.findUnique({
          where: { id: to, AND: { members: { some: { id: userId } } } },
        });
        if (!toGroup) {
          ack(false, "Group not found");
        }

        const newMessage = await db.message.create({
          data: {
            senderId: userId,
            groupId: to,
            content: message,
          },
        });

        this.io.to(to).emit("message", to, newMessage);
        ack(true, newMessage);
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
