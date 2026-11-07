import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";

export interface Session {
  metadata: {
    artistId?: number;
    onboardingComplete?: boolean;
    venueId?: number;
  };
  roles: string[];
  userId: string | null;
}

function rolesFromMetadata(metadata: unknown): string[] {
  if (typeof metadata !== "object" || metadata === null) {
    return [];
  }
  const { role, roles } = metadata as { role?: unknown; roles?: unknown };
  const collected: string[] = [];
  if (typeof role === "string") {
    collected.push(role === "admin" ? "super_admin" : role);
  }
  if (Array.isArray(roles)) {
    for (const item of roles) {
      if (typeof item === "string") {
        collected.push(item === "admin" ? "super_admin" : item);
      }
    }
  }
  return [...new Set(collected)];
}

/**
 * Session + roles for route guards (beforeLoad). Mirrors apps/arts'
 * server-function auth pattern (clerkClient publicMetadata read, with the
 * web app's legacy `admin` -> `super_admin` alias); Phase 4 swaps the
 * implementation to better-auth without changing call sites.
 */
export const getSession = createServerFn({ method: "GET" }).handler(async (): Promise<Session> => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { metadata: {}, roles: [], userId: null };
    }
    const user = await clerkClient().users.getUser(userId);
    return {
      metadata: (user.publicMetadata ?? {}) as Session["metadata"],
      roles: rolesFromMetadata(user.publicMetadata),
      userId,
    };
  } catch {
    // No Clerk middleware mounted (missing server keys) — anonymous.
    return { metadata: {}, roles: [], userId: null };
  }
});
