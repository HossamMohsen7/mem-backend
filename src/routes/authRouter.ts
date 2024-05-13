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
  resetPasswordRequestSchema,
  resetPasswordSchema,
  resetPasswordValidationSchema,
} from "../schema/userSchemas.js";
import { sha256, sixDigit } from "../utils/utils.js";

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
    return res.status(200).json({ success: true });
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
    console.log(newTokenIds.concat(tokenId));
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
    console.log(err);
    throw errors.invalidAuth;
  }
});

router.post(
  "/resetpassword",
  validate({ body: resetPasswordRequestSchema }),
  async (req, res) => {
    const { email } = {
      email: req.body.email.toLowerCase(),
    };

    const user = await db.user.findFirst({
      where: { email: email },
    });

    if (user && user.password) {
      //check last reset password request and rate limit to 10 minutes
      if (
        user.resetPasswordRequestAt &&
        user.resetPasswordRequestAt > new Date(Date.now() - 10 * 60 * 1000)
      ) {
        return res.status(204).end();
      }

      //generate a 6 digit number
      // const code = sixDigit();
      const code = "123123";
      //generate sha256 hash of the code
      const hash = sha256(code);
      db.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: hash,
          resetPasswordExpiry: new Date(Date.now() + 60 * 60 * 1000), //1 hour expiry
          resetPasswordIp: req.ip,
          resetPasswordRequestAt: new Date(),
        },
      });
      //send email
      //   sendResetPasswordMail(user.email, code);
    }

    return res.status(204).end();
  }
);

//Check if token is valid
router.post(
  "/resetpassword/validate",
  validate({ body: resetPasswordValidationSchema }),
  async (req, res) => {
    const { token } = req.body;

    const tokenHash = sha256(token);

    const user = await db.user.findUnique({
      where: { email: tokenHash },
    });

    if (!user || user.resetPasswordToken !== tokenHash) {
      throw errors.invalidResetPasswordToken;
    }

    if (user.resetPasswordExpiry! < new Date()) {
      throw errors.invalidResetPasswordToken;
    }

    return res.status(200).json({ valid: true });
  }
);

router.post(
  "/resetpassword/confirm",
  validate({ body: resetPasswordSchema }),
  async (req, res) => {
    const { password, token, email } = req.body;

    const tokenHash = sha256(token);

    const user = await db.user.findUnique({
      where: { email: email },
    });

    if (!user || user.resetPasswordToken !== tokenHash) {
      throw errors.invalidResetPasswordToken;
    }

    if (user.resetPasswordExpiry! < new Date()) {
      throw errors.invalidResetPasswordToken;
    }

    const hash = await argon2.hash(password);

    await db.user.update({
      where: { id: user.id },
      data: {
        password: hash,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
        resetPasswordIp: null,
        lastPasswordChange: new Date(),
        tokenIds: [],
      },
    });

    return res.status(204).end();
  }
);

export default router;
