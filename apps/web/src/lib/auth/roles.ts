import type { Roles } from "@/types/globals";
import { auth } from "@clerk/nextjs/server";
import { getRolesFromMetadata } from "./role";

export const checkRole = async (role: Roles): Promise<boolean> => {
  const { sessionClaims } = await auth();
  const roles = getRolesFromMetadata(sessionClaims?.metadata);
  return roles.includes(role);
};
