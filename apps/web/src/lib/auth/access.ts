import { checkRole } from "./roles";
import { auth } from "@clerk/nextjs/server";

export const canViewAll = async (): Promise<boolean> => {
  return checkRole("super_admin");
};

export const canEdit = async (
  resourceAuthorId: string
): Promise<boolean> => {
  const { userId } = await auth();
  if (!userId) return false;

  const isSuperAdmin = await checkRole("super_admin");
  if (isSuperAdmin) return true;

  // Writers can only edit their own resources
  return userId === resourceAuthorId;
};

export const canDelete = async (): Promise<boolean> => {
  return checkRole("super_admin");
};

export const canCreate = async (): Promise<boolean> => {
  const isSuperAdmin = await checkRole("super_admin");
  const isWriter = await checkRole("writer");
  return isSuperAdmin || isWriter;
};

export const canInviteWriters = async (): Promise<boolean> => {
  return checkRole("super_admin");
};

export const canManageUsers = async (): Promise<boolean> => {
  return checkRole("super_admin");
};
