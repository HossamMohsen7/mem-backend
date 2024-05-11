import express from "express";
import { db } from "../db.js";
import {
  authTokenMiddleware,
  authUserMiddleware,
} from "../middlewares/auth.js";
import { errors } from "../config/errors.js";
import { parseFormData } from "pechkin";
import { firebaseApp } from "../services/firebase.js";
import { ExerciseType } from "@prisma/client";

const router = express.Router();

router.get("/all", async (req, res) => {
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

router.post(
  "/new",
  authTokenMiddleware,
  authUserMiddleware,
  async (req, res) => {
    if (!req.user || req.user.type !== "ADMIN") {
      throw errors.notAllowed;
    }

    const { fields, files } = await parseFormData(req, {
      maxFileCountPerField: 1,
      maxTotalFileCount: 1,
    });

    const { name, description, type } = fields;

    if (!name || !description || !type) {
      throw errors.unexpected;
    }

    const enumType =
      type == "breathing"
        ? ExerciseType.BREATHING
        : type == "yoga"
        ? ExerciseType.YOGA
        : ExerciseType.VID_3D;

    for await (const { stream, field, filename } of files) {
      const ext = filename.split(".").pop();
      const storage = firebaseApp.storage();
      // await storage.bucket().file(`pics/${req.user.id}.${ext}`);

      const blob = storage.bucket().file(`exercises/${Date.now()}.${ext}`);
      const blobStream = blob.createWriteStream();

      stream.pipe(blobStream);

      await new Promise((resolve, reject) => {
        blobStream.on("finish", resolve);
        blobStream.on("error", reject);
      });

      const url = await blob.getSignedUrl({
        action: "read",
        expires: "03-09-2491",
      });

      console.log(url);

      const newExercise = await db.exercise.create({
        data: {
          name,
          description,
          mediaUrl: url[0],
          type: enumType,
          createdById: req.user.id,
        },
      });

      return res.status(200).send(newExercise);
    }

    return res.status(204).end();
  }
);

export default router;
