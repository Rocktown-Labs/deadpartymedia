import { users } from "@dpmedia/db/schema";
import type { NeonHttpDb } from "@dpmedia/db/http";
import { roleOrDefault } from "./role";
import type { Roles } from "./role";

/**
 * Ported from apps/web/src/lib/auth/user-state.ts, with the db instance
 * passed explicitly (no module singleton in a Worker).
 */

interface UpsertUserAuthStateInput {
  clerkId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  role?: unknown;
  onboardingComplete?: boolean;
}

export async function upsertUserAuthState(
  db: NeonHttpDb,
  {
    clerkId,
    email,
    firstName,
    imageUrl,
    lastName,
    role,
    onboardingComplete = false,
  }: UpsertUserAuthStateInput,
): Promise<void> {
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
