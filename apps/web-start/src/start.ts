import { createStart } from "@tanstack/react-start";

/**
 * Minimal Start configuration for the scaffold. Auth middleware (Clerk,
 * matching apps/arts' proven pattern) is added here when the first
 * authenticated route migrates; better-auth replaces it in Phase 4.
 */
export const startInstance = createStart(() => ({
  requestMiddleware: [],
}));
