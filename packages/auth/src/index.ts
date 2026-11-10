import type { D1Database, SendEmail } from "@cloudflare/workers-types";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { emailOTP, oneTimeToken } from "better-auth/plugins";
import { createD1Database } from "@dpmedia/db/d1";
import { users } from "@dpmedia/db/schema";

export interface AuthConfig {
  AUTH_DB: D1Database;
  ARTS_DB?: D1Database;
  MUSIC_DB?: D1Database;
  EMAIL: SendEmail;
  MAIL_FROM: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  TRUSTED_ORIGINS: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}
export function createIdentityDatabase(binding: D1Database) {
  return drizzle(binding);
}
export function createAuth(env: AuthConfig, request?: Request) {
  const origins = env.TRUSTED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const frontendOrigin =
    request?.headers.get("x-deadparty-origin") || request?.headers.get("origin");
  const baseURL =
    frontendOrigin && origins.includes(frontendOrigin) && /^https?:\/\//.test(frontendOrigin)
      ? frontendOrigin
      : env.BETTER_AUTH_URL;
  const database = createIdentityDatabase(env.AUTH_DB);
  return betterAuth({
    database: drizzleAdapter(database, { provider: "sqlite", schema }),
    baseURL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [
      ...env.TRUSTED_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
      "deadparty://",
    ],
    socialProviders:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
        : {},
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await env.EMAIL.send({
          from: env.MAIL_FROM,
          to: user.email,
          subject: "Reset your Dead Party password",
          text: `Reset your password: ${url}`,
        });
      },
      password: {
        hash: hashPassword,
        verify: ({ hash, password }) =>
          /^\$2[aby]\$/.test(hash) ? compare(password, hash) : verifyPassword({ hash, password }),
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
    },
    user: {
      additionalFields: { disabled: { type: "boolean", defaultValue: false, input: false } },
      changeEmail: {
        enabled: true,
        updateEmailWithoutVerification: false,
        sendChangeEmailConfirmation: async ({ user, url }) => {
          await env.EMAIL.send({
            from: env.MAIL_FROM,
            to: user.email,
            subject: "Confirm your Dead Party email change",
            text: `Confirm your email change: ${url}`,
          });
        },
      },
    },
    databaseHooks: {
      user: {
        update: {
          after: async (identity) => {
            const [firstName = "", ...rest] = identity.name.trim().split(/\s+/);
            const profile = {
              firstName,
              lastName: rest.join(" "),
              email: identity.email,
              imageUrl: identity.image ?? null,
              updatedAt: new Date(),
            };
            // Existing domain profiles are projections of identity. This never
            // creates memberships, changes roles, or creates a profile in another app.
            await Promise.all(
              [env.ARTS_DB, env.MUSIC_DB]
                .filter((binding): binding is D1Database => !!binding)
                .map((binding) =>
                  createD1Database(binding)
                    .update(users)
                    .set(profile)
                    .where(eq(users.clerkId, identity.id)),
                ),
            );
          },
        },
      },
      session: {
        create: {
          before: async (candidate) => {
            const [identity] = await database
              .select({ disabled: schema.user.disabled })
              .from(schema.user)
              .where(eq(schema.user.id, candidate.userId))
              .limit(1);
            if (identity?.disabled)
              throw new APIError("FORBIDDEN", { message: "This account is disabled" });
          },
        },
      },
    },
    disabledPaths: ["/one-time-token/generate", "/one-time-token/verify"],
    plugins: [
      expo(),
      oneTimeToken({ disableClientRequest: true, storeToken: "hashed", expiresIn: 1 }),
      emailOTP({
        disableSignUp: true,
        overrideDefaultEmailVerification: true,
        storeOTP: "hashed",
        sendVerificationOTP: async ({ email, otp, type }) => {
          await env.EMAIL.send({
            from: env.MAIL_FROM,
            to: email,
            subject:
              type === "email-verification"
                ? "Verify your Dead Party email"
                : "Your Dead Party sign-in code",
            text: `Your Dead Party code is ${otp}. It expires in 5 minutes.`,
          });
        },
      }),
    ],
  });
}
export type IdentityDatabase = ReturnType<typeof createIdentityDatabase>;
export type Auth = ReturnType<typeof createAuth>;
