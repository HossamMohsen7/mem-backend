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
      const ext = filename.split(".").pop();
      const storage = firebaseApp.storage();
      // await storage.bucket().file(`pics/${req.user.id}.${ext}`);

      const blob = storage.bucket().file(`pics/${req.user.id}.${ext}`);
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

      await db.user.update({
        where: { id: req.user!.id },
        data: {
          profilePictureUrl: url[0],
        },
      });

      return res.status(200).send({
        url: url[0],
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
