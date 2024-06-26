import "reflect-metadata";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import hpp from "hpp";
import { createServer } from "http";
import morgan from "morgan";
import env from "./env.js";
import { requestIdMiddleware } from "./middlewares/requestId.js";
import authRouter from "./routes/authRouter.js";
import { errorHandler } from "./utils/errorHandler.js";
import { errors } from "./config/errors.js";
import AppError from "./models/error.js";
import userRouter from "./routes/userRouter.js";
import notificationsRouter from "./routes/notificationsRouter.js";
import meetingsRouter from "./routes/meetingsRouter.js";
import groupsRouter from "./routes/groupsRouter.js";
import exercisesRouter from "./routes/exercisesRouter.js";
import { SocketManager } from "./socketManager.js";
import { db } from "./db.js";
import argon2 from "argon2";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
const app = express();
const http = createServer(app);

const setupSocketIO = () => {
  SocketManager.init(http);
};

const setupExpressApp = async () => {
  app.enable("trust proxy");
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(hpp());
  app.use(
    cors({
      origin: true,
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );
  app.use(requestIdMiddleware);
  app.use(morgan("combined"));

  setupRouters();

  setupErrorHandlers();
  errorHandler.listenToErrorEvents();
};

const setupRouters = () => {
  app.get("/", (req, res) =>
    res.status(200).send("Everything is working great!")
  );

  app.use("/auth", authRouter);
  app.use("/user", userRouter);
  app.use("/notifications", notificationsRouter);
  app.use("/meetings", meetingsRouter);
  app.use("/groups", groupsRouter);
  app.use("/exercises", exercisesRouter);
};

const setupErrorHandlers = () => {
  app.use((req, res, next) => {
    next(errors.notFound);
  });

  app.use(
    async (
      error: unknown,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      next(await errorHandler.handleError(error));
    }
  );

  app.use(
    async (
      error: AppError,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      return res.status(error.statusCode).json({
        success: false,
        errorCode: error.errorCode,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        data: error.data,
      });
    }
  );
};

const startServer = () => {
  console.log("Starting server..");
  const port = env.PORT;
  http.listen(port, () => {
    console.log("listening on *:" + port);
  });
};

const checkAdminAccount = async () => {
  const admin = await db.user.findUnique({
    where: { email: "admin@admin.com" },
  });
  if (!admin) {
    const pass = await argon2.hash("admin");
    await db.user.create({
      data: {
        email: "admin@admin.com",
        password: pass,
        type: "ADMIN",
        firstName: "Mem",
        lastName: "Admin",
        username: "admin",
      },
    });
  }
};

const main = async () => {
  console.log("Environment: " + env.NODE_ENV);

  console.log("Checking admin account");
  checkAdminAccount();

  setupExpressApp();
  setupSocketIO();
  startServer();
};

main();
