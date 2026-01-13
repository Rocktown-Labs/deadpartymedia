"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { userUpdateSchema, passwordChangeSchema } from "@/lib/validations/user";
import type {
  UserUpdateInput,
  PasswordChangeInput,
} from "@/lib/validations/user";
import { logger } from "@/lib/logger";
import { withUserContext } from "@/lib/logger/context";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function updateUserProfile(data: UserUpdateInput) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  const log = withUserContext(logger, userId);

  // Validate input
  const validationResult = userUpdateSchema.safeParse(data);
  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.issues.map((e) => e.message).join(", "),
    };
  }

  const validatedData = validationResult.data;
  const client = await clerkClient();

  try {
    await client.users.updateUser(userId, {
      firstName: validatedData.first_name,
      lastName: validatedData.last_name,
    });

    // Note: Email updates in Clerk require verification, so we'll handle that separately
    // For now, we'll just update the name fields
    // If email needs to be updated, Clerk will send a verification email

    return { success: true };
  } catch (error: any) {
    log.error(
      { error: sanitizeError(error), operation: "update_user_profile" },
      "Error updating user profile"
    );
    return {
      success: false,
      error: error.errors?.[0]?.longMessage || "Failed to update profile",
    };
  }
}

export async function changeUserPassword(
  data: Omit<PasswordChangeInput, "confirm_password">
) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Validate input
  const validationResult = passwordChangeSchema.safeParse({
    ...data,
    confirm_password: data.new_password,
  });
  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.issues.map((e) => e.message).join(", "),
    };
  }

  // Clerk's password change requires the current password and new password
  // We need to use the user's current session to verify the password
  // Note: Clerk doesn't have a direct API to change password with current password verification
  // Users should use Clerk's built-in password change flow via UserProfile component
  // For now, we'll return an error suggesting they use the account portal

  // Alternative: We can use Clerk's password reset flow, but that requires email verification
  // The best approach is to redirect users to Clerk's UserProfile component for password changes

  return {
    success: false,
    error:
      "Password changes should be done through your account settings. Please use the account management menu.",
  };
}
