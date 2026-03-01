import { checkRole } from "./roles";
import { auth } from "@clerk/nextjs/server";
import { logger } from "../logger";
import { withUserContext } from "../logger/context";

export const canViewAll = async (): Promise<boolean> => checkRole("super_admin");

export const canEdit = async (resourceAuthorId: string): Promise<boolean> => {
  const { userId } = await auth();
  if (!userId) {
    logger.warn({ operation: "can_edit", resourceAuthorId }, "Unauthenticated edit attempt");
    return false;
  }

  const isSuperAdmin = await checkRole("super_admin");
  if (isSuperAdmin) {
    withUserContext(logger, userId).debug(
      { operation: "can_edit", resourceAuthorId, result: true },
      "Super admin edit permission granted",
    );
    return true;
  }

  // Writers can only edit their own resources
  const canEditOwn = userId === resourceAuthorId;
  withUserContext(logger, userId).debug(
    { operation: "can_edit", resourceAuthorId, result: canEditOwn },
    canEditOwn ? "Edit permission granted" : "Edit permission denied",
  );
  return canEditOwn;
};

export const canDelete = async (): Promise<boolean> => {
  const { userId } = await auth();
  const canDeleteResource = await checkRole("super_admin");

  if (userId) {
    withUserContext(logger, userId).debug(
      { operation: "can_delete", result: canDeleteResource },
      canDeleteResource ? "Delete permission granted" : "Delete permission denied",
    );
  } else {
    logger.warn({ operation: "can_delete" }, "Unauthenticated delete attempt");
  }

  return canDeleteResource;
};

export const canCreate = async (): Promise<boolean> => {
  const { userId } = await auth();
  const isSuperAdmin = await checkRole("super_admin");
  const isWriter = await checkRole("writer");
  const canCreateResource = isSuperAdmin || isWriter;

  if (userId) {
    withUserContext(logger, userId).debug(
      { isSuperAdmin, isWriter, operation: "can_create", result: canCreateResource },
      canCreateResource ? "Create permission granted" : "Create permission denied",
    );
  } else {
    logger.warn({ operation: "can_create" }, "Unauthenticated create attempt");
  }

  return canCreateResource;
};

export const canInviteWriters = async (): Promise<boolean> => checkRole("super_admin");

export const canManageUsers = async (): Promise<boolean> => checkRole("super_admin");
