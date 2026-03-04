import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { Roles } from "@/types/globals";
import { roleOrDefault } from "./role";

interface UpsertUserAuthStateInput {
  clerkId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  role?: unknown;
  onboardingComplete?: boolean;
}

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
      imageUrl: imageUrl ?? null,
      lastName: lastName ?? null,
      onboardingComplete,
      role: normalizedRole,
    })
    .onConflictDoUpdate({
      set: {
        email,
        firstName: firstName ?? null,
        imageUrl: imageUrl ?? null,
        lastName: lastName ?? null,
        onboardingComplete,
        role: normalizedRole,
        updatedAt: new Date(),
      },
      target: users.clerkId,
    });
}
