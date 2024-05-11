import * as z from "zod";
const NAME_REGEX =
  /^[a-zA-Z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u01FF]+([ \-']{0,1}[a-zA-Z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u01FF]+){0,2}[.]{0,1}$/;
export const passwordSignupSchema = z.object({
  firstName: z.string().transform((val) => val.trim()),
  lastName: z.string().transform((val) => val.trim()),
  email: z.string().email(),
  username: z.string(),
  password: z.string(),
  type: z.enum(["related", "stutterer"]),
});

//phone or email
export const passwordSigninSchema = z.object({
  emailOrUsername: z.string(),
  password: z.string(),
});

export const externalAuthSchema = z.object({
  token: z.string(),
  provider: z.enum(["facebook", "google", "github"]),
});

export const resetPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordValidationSchema = z.object({
  email: z.string().email(),
  token: z.string(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])\S+$/),
});
