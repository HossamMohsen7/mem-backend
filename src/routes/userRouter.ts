import express from "express";
import {
  authTokenMiddleware,
  authUserMiddleware,
} from "../middlewares/auth.js";
import { userModel } from "../models/user.js";
import { db } from "../db.js";

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
    const { url } = req.body;
    await db.user.update({
      where: { id: req.user!.id },
      data: {
        profilePictureUrl: url,
      },
    });
    return res.status(204).end();
  }
);

export default router;
