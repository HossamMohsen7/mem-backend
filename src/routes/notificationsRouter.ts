import express from "express";
import {
  authTokenMiddleware,
  authUserMiddleware,
} from "../middlewares/auth.js";
import { db } from "../db.js";
import { errors } from "../config/errors.js";
import { validate } from "zod-express-validator";
import { newNotificationSchema } from "../schema/notificationsSchema.js";

const router = express.Router();

router.post(
  "/new",
  authTokenMiddleware,
  authUserMiddleware,
  validate({ body: newNotificationSchema }),
  async (req, res) => {
    if (!req.user || req.user.type !== "ADMIN") {
      throw errors.notAllowed;
    }

    const notification = await db.notification.create({
      data: {
        message: req.body.message,
        for:
          req.body.for == "related"
            ? "RELATED"
            : req.body.for === "stutterer"
            ? "STUTTERER"
            : "ALL",
        userId: req.user.id,
      },
    });

    //TODO: firebase push notification

    res.status(201).send(notification);
  }
);

router.get(
  "/all",
  authTokenMiddleware,
  authUserMiddleware,
  async (req, res) => {
    if (!req.user) {
      throw errors.notAllowed;
    }

    const notifications = await db.notification.findMany({
      where: {
        for: {
          in: ["ALL", req.user.type === "STUTTERER" ? "STUTTERER" : "RELATED"],
        },
      },
    });

    res.status(200).send(notifications);
  }
);

export default router;
