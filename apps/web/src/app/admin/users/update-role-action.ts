"use server";

import { updateUserRole } from "./actions";
import { Roles } from "@/types/globals";

export async function updateRoleAction(formData: FormData) {
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as Roles;
  return updateUserRole(userId, role);
}
