import express from "express";
import { db } from "../db.js";
import {
  authTokenMiddleware,
  authUserMiddleware,
} from "../middlewares/auth.js";
import { errors } from "../config/errors.js";
import { parseFormData } from "pechkin";

const router = express.Router();

router.get("/", async (req, res) => {
  const exercises = await db.exercise.findMany({});

  return res.status(200).json(exercises);
});

router.delete(
  "/:id",
  authTokenMiddleware,
  authUserMiddleware,
  async (req, res) => {
    if (!req.user || req.user.type !== "ADMIN") {
      throw errors.notAllowed;
    }

    const exercise = await db.exercise.findUnique({
      where: { id: req.params.id },
    });

    if (!exercise) {
      throw errors.notFound;
    }

    await db.exercise.delete({ where: { id: req.params.id } });

    return res.status(204).send();
  }
);

router.post("/", authTokenMiddleware, authUserMiddleware, async (req, res) => {
  if (!req.user || req.user.type !== "ADMIN") {
    throw errors.notAllowed;
  }

  const { fields, files } = await parseFormData(req, {
    maxFileCountPerField: 1,
    maxTotalFileCount: 1,
  });
});

export default router;
