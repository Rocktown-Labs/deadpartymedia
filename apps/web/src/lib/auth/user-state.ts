import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { Roles } from "@/types/globals";
import { roleOrDefault } from "./role";

type UpsertUserAuthStateInput = {
  clerkId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  role?: unknown;
  onboardingComplete?: boolean;
};

export async function upsertUserAuthState({
  clerkId,
  email,
  firstName,
  lastName,
  imageUrl,
  role,
  onboardingComplete = false,
}: UpsertUserAuthStateInput) {
  const normalizedRole: Roles = roleOrDefault(role, "fan");

  await db
    .insert(users)
    .values({
      clerkId,
      email,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      imageUrl: imageUrl ?? null,
      role: normalizedRole,
      onboardingComplete,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        imageUrl: imageUrl ?? null,
        role: normalizedRole,
        onboardingComplete,
        updatedAt: new Date(),
      },
    });
}
