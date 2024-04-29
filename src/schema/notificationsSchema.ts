import * as z from "zod";

export const newNotificationSchema = z.object({
  message: z.string(),
  for: z.enum(["related", "stutterer", "all"]),
});
