import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { createStart } from "@tanstack/react-start";

const hasClerkServerKeys = Boolean(process.env.CLERK_SECRET_KEY);

/**
 * Clerk middleware is only mounted when server keys are configured (the
 * same pattern as apps/arts) — public routes work without Clerk, and the
 * authenticated routes (dashboard, admin) require keys in .env.local.
 * Phase 4 (MIGRATION_PLAN.md) swaps this for better-auth session handling.
 */
export const startInstance = createStart(() => ({
  requestMiddleware: hasClerkServerKeys ? [clerkMiddleware()] : [],
}));
