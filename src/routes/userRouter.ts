import express from "express";
import {
  authTokenMiddleware,
  authUserMiddleware,
} from "../middlewares/auth.js";
import { userModel } from "../models/user.js";

const router = express.Router();

router.get(
  "/info",
  authTokenMiddleware,
  authUserMiddleware,
  async (req, res) => {
    return res.status(200).send(userModel(req.user!));
  }
);

export default router;
