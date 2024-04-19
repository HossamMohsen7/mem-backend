import AppError from "../models/error.js";
export const errorCodes = {
  unexpected: 1999,
  notFound: 1000,
  validation: 1001,
  invalidLogin: 1000,
  invalidAuth: 1001,
  userExists: 1002,
  invalidProvider: 1003,
  invalidProviderToken: 1004,
  insufficientTokenPermission: 1005,
} as const;

export const errors = {
  notAllowed: AppError.custom(403, errorCodes.notAllowed, "Not allowed"),
  notFound: AppError.custom(404, errorCodes.notFound, "Not found"),
  unexpected: AppError.custom(
    500,
    errorCodes.unexpected,
    "Something went wrong"
  ),
  invalidLogin: AppError.custom(
    401,
    errorCodes.invalidLogin,
    "Invalid email, phone number or password."
  ),
  invalidAuth: AppError.custom(401, errorCodes.invalidAuth, "Invalid token."),
  userExists: AppError.custom(
    403,
    errorCodes.userExists,
    "Email or phone number already used."
  ),

  invalidProvider: AppError.custom(
    403,
    errorCodes.invalidProvider,
    "Invalid provider."
  ),
  invalidProviderToken: AppError.custom(
    403,
    errorCodes.invalidProviderToken,
    "Invalid external token."
  ),
  insufficientTokenPermission: AppError.custom(
    403,
    errorCodes.insufficientTokenPermission,
    "Insufficient token permission, need email and profile."
  ),
} as const;
