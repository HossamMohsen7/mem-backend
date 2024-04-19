import express from "express";
import { authTokenMiddleware } from "../middlewares/auth.js";
import { User } from "@prisma/client";
import { nanoid } from "nanoid";
import { validate } from "zod-express-validator";
import { errors } from "../config/errors.js";
import { db } from "../db.js";
import env from "../env.js";
import { v4 as uuidv4 } from "uuid";
import jwt, { JwtPayload } from "jsonwebtoken";
import * as argon2 from "argon2";
import { userModel } from "../models/user.js";
import {
  passwordSigninSchema,
  passwordSignupSchema,
} from "../schema/userSchemas.js";
const router = express.Router();

const generateToken = (user: User): [string, string] => {
  const tokenId = uuidv4();
  const token = jwt.sign(
    {
      email: user.email.toLowerCase(),
    },
    env.JWT_SECRET,
    { expiresIn: "3d", subject: user.id, jwtid: tokenId }
  );
  return [token, tokenId];
};

router.post(
  "/signup/password",
  validate({ body: passwordSignupSchema }),
  async (req, res) => {
    //lower case email
    const body = { ...req.body, email: req.body.email.toLowerCase() };

    const hash = await argon2.hash(body.password);

    //find user by email or phone number
    const foundUser = await db.user.findFirst({
      where: {
        OR: [{ email: body.email }, { username: body.username }],
      },
    });

    if (foundUser) {
      throw errors.userExists;
    }

    const user = await db.user.create({
      data: {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        password: hash,
        username: body.username,
        type: body.type == "related" ? "RELATED" : "STUTTERER",
      },
    });

    const [token, tokenId] = generateToken(user);
    await db.user.update({
      where: { id: user.id },
      data: {
        tokenIds: { push: tokenId },
      },
    });

    return res.status(200).send({
      token,
      ...userModel(user),
    });
  }
);

router.post(
  "/signin/password",
  validate({ body: passwordSigninSchema }),
  async (req, res) => {
    const body = {
      ...req.body,
    };

    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: body.emailOrUsername },
          { username: body.emailOrUsername },
        ],
      },
    });
    if (!user || !user.password) {
      throw errors.invalidLogin;
    }

    if (!(await argon2.verify(user.password, body.password))) {
      throw errors.invalidLogin;
    }

    const [token, tokenId] = generateToken(user);
    await db.user.update({
      where: { id: user.id },
      data: {
        tokenIds: { push: tokenId },
      },
    });
    return res.status(200).send({
      token,
      ...userModel(user),
    });
  }
);

router.post("/validate", async (req, res) => {
  const { token } = req.body;
  try {
    jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return res.status(204).end();
  } catch (err) {
    throw errors.invalidAuth;
  }
});

router.post("/refresh", async (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      ignoreExpiration: true,
    }) as JwtPayload;
    const userId = decoded.sub;
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw errors.invalidAuth;
    }

    const newTokenIds = user.tokenIds.filter((id) => id !== decoded.jti);

    const [newToken, tokenId] = generateToken(user);
    await db.user.update({
      where: { id: user.id },
      data: {
        tokenIds: { set: newTokenIds.concat(tokenId) },
      },
    });
    return res.status(200).send({
      newToken,
      ...userModel(user),
    });
  } catch (err) {
    throw errors.invalidAuth;
  }
});

export default router;
