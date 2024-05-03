import express from "express";
import {
  authTokenMiddleware,
  authUserMiddleware,
} from "../middlewares/auth.js";
import { db } from "../db.js";
import { errors } from "../config/errors.js";
import { validate } from "zod-express-validator";
import { newNotificationSchema } from "../schema/notificationsSchema.js";
import { Notification } from "@prisma/client";
import { sendNotification } from "../services/firebase.js";

const router = express.Router();

const doSendNotification = async (notification: Notification) => {
  const fcmTokens: string[] = [];

  if (notification.for === "ALL") {
    const users = await db.user.findMany({
      where: { firebaseToken: { not: null } },
    });
    fcmTokens.push(...users.map((u) => u.firebaseToken!));
  } else if (notification.for === "STUTTERER") {
    const users = await db.user.findMany({
      where: { type: "STUTTERER", firebaseToken: { not: null } },
    });
    fcmTokens.push(...users.map((u) => u.firebaseToken!));
  } else {
    const users = await db.user.findMany({
      where: { type: "RELATED", firebaseToken: { not: null } },
    });
    fcmTokens.push(...users.map((u) => u.firebaseToken!));
  }

  sendNotification(fcmTokens, notification.message);
};

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

    doSendNotification(notification);

    return res.status(201).send(notification);
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

    if (req.user.type === "ADMIN") {
      const notifications = await db.notification.findMany();
      return res.status(200).send(notifications);
    }

    const notifications = await db.notification.findMany({
      where: {
        for: {
          in: ["ALL", req.user.type === "STUTTERER" ? "STUTTERER" : "RELATED"],
        },
      },
    });

    return res.status(200).send(notifications);
  }
);

//delete notification
router.delete(
  "/:id",
  authTokenMiddleware,
  authUserMiddleware,
  async (req, res) => {
    if (!req.user || req.user.type !== "ADMIN") {
      throw errors.notAllowed;
    }

    const notification = await db.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      throw errors.notFound;
    }

    await db.notification.delete({ where: { id: req.params.id } });

    return res.status(204).send();
  }
);

//edit notification
router.put(
  "/:id",
  authTokenMiddleware,
  authUserMiddleware,
  validate({ body: newNotificationSchema }),
  async (req, res) => {
    if (!req.user || req.user.type !== "ADMIN") {
      throw errors.notAllowed;
    }

    const notification = await db.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      throw errors.notFound;
    }

    const updated = await db.notification.update({
      where: { id: req.params.id },
      data: {
        message: req.body.message,
        for:
          req.body.for == "related"
            ? "RELATED"
            : req.body.for === "stutterer"
            ? "STUTTERER"
            : "ALL",
      },
    });

    doSendNotification(updated);

    return res.status(200).send(updated);
  }
);

export default router;
