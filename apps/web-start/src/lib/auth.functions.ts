import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";

/**
 * Session check for route guards (beforeLoad). Mirrors apps/arts'
 * server-function auth pattern; Phase 4 swaps the implementation to
 * better-auth's getSession without changing call sites.
 */
export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { userId } = await auth();
    return { userId: userId ?? null };
  } catch {
    // No Clerk middleware mounted (missing server keys) — treat as anonymous.
    return { userId: null };
  }
});
