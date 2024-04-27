import express from "express";
import {
  authTokenMiddleware,
  authUserMiddleware,
} from "../middlewares/auth.js";
import { userModel } from "../models/user.js";
import { db } from "../db.js";
import { parseFormData } from "pechkin";
import { firebaseApp } from "../services/firebase.js";

const router = express.Router();

router.get(
  "/info",
  authTokenMiddleware,
  authUserMiddleware,
  async (req, res) => {
    return res.status(200).send(userModel(req.user!));
  }
);

router.post(
  "/changename",
  authTokenMiddleware,
  authUserMiddleware,
  async (req, res) => {
    const { firstName, lastName } = req.body;
    await db.user.update({
      where: { id: req.user!.id },
      data: {
        firstName: firstName,
        lastName: lastName,
      },
    });
    return res.status(204).end();
  }
);

router.post(
  "/changepic",
  authTokenMiddleware,
  authUserMiddleware,
  async (req, res) => {
    if (!req.user) {
      return res.status(401).end();
    }

    const { fields, files } = await parseFormData(req, {
      maxFileCountPerField: 1,
      maxTotalFileCount: 1,
    });

    for await (const { stream, field, filename } of files) {
      const storage = firebaseApp.storage();
      const result = await storage
        .bucket()
        .file(`/pics/${req.user.id}.${filename.split("\\.")[1]}`)
        .save(stream);

      await db.user.update({
        where: { id: req.user!.id },
        data: {
          profilePictureUrl:
            "https://storage.googleapis.com/nmemapp.appspot.com/pics/" +
            req.user.id +
            "." +
            filename.split("\\.")[1],
        },
      });

      return res
        .status(200)
        .send({
          url:
            "https://storage.googleapis.com/nmemapp.appspot.com/pics/" +
            req.user.id +
            "." +
            filename.split("\\.")[1],
        });
    }

    // await db.user.update({
    //   where: { id: req.user!.id },
    //   data: {
    //     profilePictureUrl: url,
    //   },
    // });
    return res.status(204).end();
  }
);

export default router;
