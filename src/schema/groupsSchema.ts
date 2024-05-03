import { z } from "zod";

export const newGroupSchema = z.object({
  name: z.string().min(1),
  selectedUsersIds: z.array(z.string()),
});
