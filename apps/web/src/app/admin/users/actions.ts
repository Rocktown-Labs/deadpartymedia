"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { canManageUsers } from "@/lib/auth/access";
import { type Roles } from "@/types/globals";
import { revalidatePath } from "next/cache";
import { inviteUserSchema } from "@/lib/validations/user";

export async function inviteUser(
  email: string,
  role: Roles,
  redirectUrl?: string
) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can invite users");
  }

  // Validate input
  const validationResult = inviteUserSchema.safeParse({ email, role });

  if (!validationResult.success) {
    throw new Error(
      validationResult.error.issues.map((e) => e.message).join(", ")
    );
  }

  const validatedData = validationResult.data;
  const client = await clerkClient();

  // Determine redirect URL based on role
  let defaultRedirectUrl = "/sign-up";
  if (validatedData.role === "writer") {
    defaultRedirectUrl = "/sign-up?role=writer";
  } else if (validatedData.role === "artist") {
    defaultRedirectUrl = "/sign-up?role=artist";
  } else if (validatedData.role === "fan") {
    defaultRedirectUrl = "/sign-up?role=fan";
  }

  try {
    // For super_admin and writer roles, set onboardingComplete to true
    // since they don't need to go through the onboarding flow
    const publicMetadata: Record<string, any> = {
      role: validatedData.role,
    };

    if (
      validatedData.role === "super_admin" ||
      validatedData.role === "writer"
    ) {
      publicMetadata.onboardingComplete = true;
    }

    const invitation = await client.invitations.createInvitation({
      emailAddress: validatedData.email,
      redirectUrl: redirectUrl || defaultRedirectUrl,
      publicMetadata,
    });

    revalidatePath("/admin/users");
    return { success: true, invitation };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function revokeInvitation(invitationId: string) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can revoke invitations");
  }

  const client = await clerkClient();

  try {
    await client.invitations.revokeInvitation(invitationId);

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserRole(userId: string, role: Roles) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    redirect("/sign-in" as Route);
  }

  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can change user roles");
  }

  const validRoles: Roles[] = ["artist", "fan", "super_admin", "writer"];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  const client = await clerkClient();

  try {
    // Get current user metadata to preserve existing values
    const user = await client.users.getUser(userId);
    const currentMetadata = user.publicMetadata || {};

    // Build public metadata with role update
    const publicMetadata: Record<string, any> = {
      ...currentMetadata,
      role,
    };

    // For super_admin and writer roles, set onboardingComplete to true
    // since they don't need to go through the onboarding flow
    if (role === "super_admin" || role === "writer") {
      publicMetadata.onboardingComplete = true;
    } else {
      // For non-admin roles (artist/fan), reset onboardingComplete to false
      // so users must complete onboarding for their new role
      publicMetadata.onboardingComplete = false;
    }

    await client.users.updateUserMetadata(userId, {
      publicMetadata,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUser(userId: string) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    redirect("/sign-in" as Route);
  }

  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can delete users");
  }

  const client = await clerkClient();

  try {
    await client.users.deleteUser(userId);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
