import { z } from "zod";

export const newMeetingSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  for: z.enum(["related", "stutterer", "all"]),
  selectedUsersIds: z.array(z.string()).default([]),
  dateTime: z.string().datetime(),
});
