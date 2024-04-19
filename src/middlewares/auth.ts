import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { errors } from "../config/errors.js";
import { db } from "../db.js";
import env from "../env.js";

export const authTokenMiddleware = (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const accessToken = authHeader.substring(7, authHeader.length);
    req.auth = accessToken;
  }
  next();
};

export const authUserMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.auth) {
    throw errors.invalidAuth;
  }

  try {
    const decoded = jwt.verify(req.auth, env.JWT_SECRET) as JwtPayload;
    const user = await db.user.findUnique({ where: { id: decoded.sub } });
    if (!user) {
      throw errors.invalidAuth;
    }
    if (!user.tokenIds.includes(decoded.jti!)) {
      throw errors.invalidAuth;
    }
    req.user = user;
    next();
  } catch (err) {
    throw errors.invalidAuth;
  }
};
