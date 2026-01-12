"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { userUpdateSchema, passwordChangeSchema } from "@/lib/validations/user";
import type { UserUpdateInput, PasswordChangeInput } from "@/lib/validations/user";

export async function updateUserProfile(data: UserUpdateInput) {
  // #region agent log
  const logData = {
    location: "settings/actions.ts:8",
    message: "updateUserProfile called",
    data: {
      hasEmail: !!data.email,
      emailLength: data.email?.length || 0,
      emailIsEmpty: data.email === "",
      first_name: data.first_name,
      last_name: data.last_name,
    },
    timestamp: Date.now(),
    sessionId: "debug-session",
    runId: "run1",
    hypothesisId: "B",
  };
  await fetch("http://127.0.0.1:7245/ingest/e11f1065-8d66-4a0f-be41-2674079985a7", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(logData),
  }).catch(() => {});
  // #endregion
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Validate input
  const validationResult = userUpdateSchema.safeParse(data);
  // #region agent log
  await fetch("http://127.0.0.1:7245/ingest/e11f1065-8d66-4a0f-be41-2674079985a7", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "settings/actions.ts:16",
      message: "Validation result",
      data: {
        success: validationResult.success,
        errors: validationResult.success
          ? null
          : validationResult.error.issues.map((e: any) => ({ path: e.path, message: e.message })),
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "B",
    }),
  }).catch(() => {});
  // #endregion
  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.issues.map((e) => e.message).join(", "),
    };
  }

  const validatedData = validationResult.data;
  const client = await clerkClient();

  try {
    // #region agent log
    await fetch("http://127.0.0.1:7245/ingest/e11f1065-8d66-4a0f-be41-2674079985a7", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "settings/actions.ts:27",
        message: "Updating user - email not used",
        data: {
          validatedDataEmail: validatedData.email,
          updatingFields: ["firstName", "lastName"],
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "B",
      }),
    }).catch(() => {});
    // #endregion
    await client.users.updateUser(userId, {
      firstName: validatedData.first_name,
      lastName: validatedData.last_name,
    });

    // Note: Email updates in Clerk require verification, so we'll handle that separately
    // For now, we'll just update the name fields
    // If email needs to be updated, Clerk will send a verification email

    return { success: true };
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    return {
      success: false,
      error: error.errors?.[0]?.longMessage || "Failed to update profile",
    };
  }
}

export async function changeUserPassword(data: Omit<PasswordChangeInput, "confirm_password">) {
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
