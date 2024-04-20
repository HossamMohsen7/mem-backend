import * as z from "zod";

export const passwordSignupSchema = z.object({
  firstName: z
    .string()
    .refine((val) => /^[a-zA-Z ]*$/.test(val) && val.split(" ").length <= 4, {
      message: "Invalid first name",
    })

    .transform((val) => val.trim()),
  lastName: z
    .string()
    .refine((val) => /^[a-zA-Z ]*$/.test(val) && val.split(" ").length <= 4, {
      message: "Invalid last name",
    })

    .transform((val) => val.trim()),
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
