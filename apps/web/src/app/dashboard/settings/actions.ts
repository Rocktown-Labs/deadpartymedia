import { authClient } from "@/lib/auth-client";
import type { PasswordChangeInput, UserUpdateInput } from "@/lib/validations/user";
export async function updateUserProfile(data: UserUpdateInput) {
  const result = await authClient.updateUser({
    name: `${data.first_name} ${data.last_name}`.trim(),
  });
  if (result.error)
    return { success: false, error: result.error.message || "Unable to update profile" };
  const session = await authClient.getSession();
  if (session.data?.user.email !== data.email) {
    const change = await authClient.changeEmail({
      newEmail: data.email,
      callbackURL: "/dashboard/settings",
    });
    if (change.error)
      return { success: false, error: change.error.message || "Unable to change email" };
    return { success: true, message: "Check your email to confirm the address change" };
  }
  return { success: true, message: "Profile updated successfully" };
}
export async function changeUserPassword(data: Omit<PasswordChangeInput, "confirm_password">) {
  const result = await authClient.changePassword({
    currentPassword: data.current_password,
    newPassword: data.new_password,
    revokeOtherSessions: true,
  });
  return result.error
    ? { success: false, error: result.error.message || "Unable to update password" }
    : { success: true };
}
