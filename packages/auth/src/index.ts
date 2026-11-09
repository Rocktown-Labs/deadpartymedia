import bcrypt from "bcrypt";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import type { DrizzleInstance } from "./drizzle";
import { authAccount, authSession, authUser, authVerification } from "./schema";

export interface CreateAuthOptions {
  /** Drizzle instance bound to the database holding the auth_* tables. */
  database: DrizzleInstance;
  secret: string;
  baseURL?: string;
  trustedOrigins?: string[];
}

/**
 * Dead Party ID — the shared better-auth factory.
 *
 * Passwords are verified with bcrypt so users imported from Clerk
 * (whose dashboard export contains bcrypt `password_digest` values)
 * keep their existing passwords. New hashes are bcrypt for now; after
 * the Phase 4 cutover completes we can re-hash to scrypt on sign-in.
 *
 * Unwired until Phase 4 (MIGRATION_PLAN.md). Clerk stays the active
 * provider in the meantime.
 */
export function createAuth(options: CreateAuthOptions) {
  return betterAuth({
    baseURL: options.baseURL,
    secret: options.secret,
    trustedOrigins: options.trustedOrigins,
    database: drizzleAdapter(options.database, {
      provider: "pg",
      schema: {
        user: authUser,
        session: authSession,
        account: authAccount,
        verification: authVerification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      password: {
        hash: (password) => bcrypt.hash(password, 10),
        verify: ({ hash, password }) => bcrypt.compare(password, hash),
      },
    },
    plugins: [admin()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
