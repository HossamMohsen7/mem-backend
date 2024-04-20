import { randomUUID } from "node:crypto";
import crypto from "crypto";
import { customAlphabet } from "nanoid";

export const capitalizeFirstLetter = (string: string) =>
  string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();

export const chunk = <T>(array: T[], size: number) =>
  Array.from({ length: Math.ceil(array.length / size) }, (_, index) =>
    array.slice(index * size, index * size + size)
  );

export const generateRequestId = () => randomUUID();

export const getRandomArbitrary = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min) + min);

export const sha256 = (data: string) => {
  return crypto.createHash("sha256").update(data).digest("hex");
};

export const sixDigit = customAlphabet("1234567890", 6);
