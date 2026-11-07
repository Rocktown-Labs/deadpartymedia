import type { drizzleAdapter } from "better-auth/adapters/drizzle";

/**
 * The exact drizzle instance shape better-auth's drizzle adapter accepts.
 * Using `Parameters<>` keeps us aligned with the installed better-auth
 * version instead of pinning a drizzle type of our own.
 */
export type DrizzleInstance = Parameters<typeof drizzleAdapter>[0];
