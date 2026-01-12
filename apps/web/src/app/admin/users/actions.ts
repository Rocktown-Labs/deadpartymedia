"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { canManageUsers } from "@/lib/auth/access";
import { Roles } from "@/types/globals";
import { revalidatePath } from "next/cache";

export async function inviteUser(
  email: string,
  role: Roles,
  redirectUrl?: string
) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can invite users");
  }

  const client = await clerkClient();

  // Determine redirect URL based on role
  let defaultRedirectUrl = "/sign-up";
  if (role === "writer") {
    defaultRedirectUrl = "/sign-up?role=writer";
  } else if (role === "artist") {
    defaultRedirectUrl = "/sign-up?role=artist";
  } else if (role === "fan") {
    defaultRedirectUrl = "/sign-up?role=fan";
  }

  try {
    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: redirectUrl || defaultRedirectUrl,
      publicMetadata: {
        role,
      },
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
    redirect("/sign-in");
  }

  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can revoke invitations");
  }

  const client = await clerkClient();

  try {
    await client.invitations.revokeInvitation({
      invitationId,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserRole(userId: string, role: Roles) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    redirect("/sign-in");
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
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role,
      },
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
    redirect("/sign-in");
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
