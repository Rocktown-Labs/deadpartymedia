import { type Roles } from "@/types/globals";
import { auth } from "@clerk/nextjs/server";
import { parseRole } from "./role";

export const checkRole = async (role: Roles): Promise<boolean> => {
  const { sessionClaims } = await auth();
  return parseRole(sessionClaims?.metadata?.role) === role;
};
