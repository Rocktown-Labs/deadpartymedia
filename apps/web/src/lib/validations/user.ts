import { z } from "zod";

export const userUpdateSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(150, "First name is too long"),
  last_name: z.string().min(1, "Last name is required").max(150, "Last name is too long"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
});

export const passwordChangeSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
