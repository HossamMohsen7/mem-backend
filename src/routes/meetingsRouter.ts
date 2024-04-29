import express from "express";
import {
  authTokenMiddleware,
  authUserMiddleware,
} from "../middlewares/auth.js";
import { validate } from "zod-express-validator";
import { newMeetingSchema } from "../schema/meetingsSchema.js";
import { errors } from "../config/errors.js";
import { db } from "../db.js";

const router = express.Router();

router.post(
  "/new",
  authTokenMiddleware,
  authUserMiddleware,
  validate({ body: newMeetingSchema }),
  async (req, res) => {
    if (!req.user) {
      throw errors.notAllowed;
    }

    const meeting = await db.meeting.create({
      data: {
        name: req.body.name,
        url: req.body.url,
        for:
          req.body.for == "related"
            ? "RELATED"
            : req.body.for === "stutterer"
            ? "STUTTERER"
            : "ALL",
        selectedUsersIds: req.body.selectedUsersIds,
        dateTime: new Date(req.body.dateTime),
        createdById: req.user.id,
      },
    });

    return res.status(201).send(meeting);
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
      const meetings = await db.meeting.findMany();
      return res.status(200).send(meetings);
    }

    const meetings = await db.meeting.findMany({
      where: {
        for: {
          in: ["ALL", req.user.type === "STUTTERER" ? "STUTTERER" : "RELATED"],
        },
      },
    });

    return res.status(200).send(meetings);
  }
);

router.delete(
  "/:id",
  authTokenMiddleware,
  authUserMiddleware,
  async (req, res) => {
    if (!req.user || req.user.type !== "ADMIN") {
      throw errors.notAllowed;
    }

    await db.meeting.delete({
      where: {
        id: req.params.id,
      },
    });

    return res.status(204).end();
  }
);

router.put(
  "/:id",
  authTokenMiddleware,
  authUserMiddleware,
  validate({ body: newMeetingSchema }),
  async (req, res) => {
    if (!req.user || req.user.type !== "ADMIN") {
      throw errors.notAllowed;
    }

    const updated = await db.meeting.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        url: req.body.url,
        for:
          req.body.for == "related"
            ? "RELATED"
            : req.body.for === "stutterer"
            ? "STUTTERER"
            : "ALL",
        selectedUsersIds: req.body.selectedUsersIds,
        dateTime: new Date(req.body.dateTime),
      },
    });

    return res.status(200).send(updated);
  }
);

export default router;
