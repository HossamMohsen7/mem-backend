import express from "express";
import {
  authTokenMiddleware,
  authUserMiddleware,
} from "../middlewares/auth.js";
import { validate } from "zod-express-validator";
import { errors } from "../config/errors.js";
import { newGroupSchema } from "../schema/groupsSchema.js";
import { db } from "../db.js";

const router = express.Router();

router.post(
  "/new",
  authTokenMiddleware,
  authUserMiddleware,
  validate({ body: newGroupSchema }),
  async (req, res) => {
    if (!req.user || req.user.type !== "ADMIN") {
      throw errors.notAllowed;
    }

    const group = await db.group.create({
      data: {
        name: req.body.name,
        createdById: req.user.id,
        members: {
          connect: req.body.selectedUsersIds.map((id) => ({ id })),
        },
      },
    });

    return res.status(201).send(group);
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
      const groups = await db.group.findMany();
      return res.status(200).send(groups);
    }

    const groups = await db.group.findMany({
      where: {
        members: {
          some: {
            id: req.user.id,
          },
        },
      },
    });

    return res.status(200).send(groups);
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

    const group = await db.group.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!group) {
      throw errors.notFound;
    }

    await db.group.delete({
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
  validate({ body: newGroupSchema }),
  async (req, res) => {
    if (!req.user || req.user.type !== "ADMIN") {
      throw errors.notAllowed;
    }

    const group = await db.group.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!group) {
      throw errors.notFound;
    }

    await db.group.update({
      where: {
        id: req.params.id,
      },
      data: {
        name: req.body.name,
        members: {
          set: req.body.selectedUsersIds.map((id) => ({ id })),
        },
      },
    });

    return res.status(200).send();
  }
);

export default router;
