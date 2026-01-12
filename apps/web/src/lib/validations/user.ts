import { z } from "zod";

export const inviteUserSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  role: z.enum(["super_admin", "writer", "artist", "fan"], {
    errorMap: () => ({ message: "Please select a valid role" }),
  }),
});

export type InviteUserFormData = z.infer<typeof inviteUserSchema>;
