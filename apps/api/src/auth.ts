import { createClerkClient, verifyToken } from "@clerk/backend";
import { HTTPException } from "hono/http-exception";
import type { MiddlewareHandler } from "hono";
import type { AppEnv, AuthContext, Bindings } from "./bindings";

export type ClerkBackendClient = ReturnType<typeof createClerkClient>;

/**
 * Clerk JWT verification — the auth seam of this API.
 *
 * Phase 4 (MIGRATION_PLAN.md) swaps this for better-auth session
 * validation; route code only depends on `getAuth`/`requireAuth`/
 * `requireRole`, never on Clerk directly.
 */

/** Lazily-created per-isolate Clerk backend client. */
let clerkClientCache: { key: string; client: ClerkBackendClient } | null = null;

export function clerkClient(env: Bindings): ClerkBackendClient {
  const key = env.CLERK_SECRET_KEY;
  if (!clerkClientCache || clerkClientCache.key !== key) {
    clerkClientCache = {
      key,
      client: createClerkClient({
        secretKey: env.CLERK_SECRET_KEY,
        publishableKey: env.CLERK_PUBLISHABLE_KEY || undefined,
      }),
    };
  }
  return clerkClientCache.client;
}

export function resetClerkClientCache(): void {
  clerkClientCache = null;
}

function extractSessionToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();
    if (token) {
      return token;
    }
  }
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }
  for (const part of cookieHeader.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === "__session" && value.length > 0) {
      return decodeURIComponent(value.join("="));
    }
  }
  return null;
}

/** Verifies Clerk session tokens (Bearer or __session cookie) and sets `auth`. */
export function clerkAuth(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const token = extractSessionToken(c.req.raw);
    if (token && c.env.CLERK_SECRET_KEY) {
      try {
        const claims = await verifyToken(token, {
          secretKey: c.env.CLERK_SECRET_KEY,
        });
        if (claims.sub) {
          c.set("auth", {
            userId: claims.sub,
            sessionId: typeof claims.sid === "string" ? claims.sid : null,
            claims: claims as unknown as Record<string, unknown>,
          });
        }
      } catch {
        // Invalid or expired token: treat the caller as anonymous.
        // Protected routes will 401 via requireAuth.
      }
    }
    await next();
  };
}

export function getAuth(c: { get(key: "auth"): AuthContext | null }): AuthContext | null {
  return c.get("auth");
}

export function requireAuth(
  c: { get(key: "auth"): AuthContext | null },
): AuthContext {
  const auth = c.get("auth");
  if (!auth) {
    throw new HTTPException(401, {
      res: Response.json({ error: "Unauthorized" }),
    });
  }
  return auth;
}

export function requireRole(
  c: { get(key: "auth"): AuthContext | null },
  allowed: readonly string[],
): AuthContext {
  const auth = requireAuth(c);
  const roles = getRolesFromMetadata(auth.claims);
  if (!roles.some((role) => allowed.includes(role))) {
    throw new HTTPException(403, {
      res: Response.json({ error: "Forbidden" }),
    });
  }
  return auth;
}

/**
 * Reads roles from Clerk session claims. Mirrors
 * apps/web/src/lib/auth/role.ts — the custom JWT template puts role
 * metadata under `metadata` (role string + roles array, plus a legacy
 * `admin` alias for super_admin).
 */
export function getRolesFromMetadata(claims: Record<string, unknown>): string[] {
  const metadata = claims.metadata as
    | { role?: unknown; roles?: unknown }
    | undefined;
  const roles = new Set<string>();
  const claimedRole = typeof metadata?.role === "string" ? metadata.role : null;
  const claimedRoles = Array.isArray(metadata?.roles)
    ? (metadata?.roles as unknown[]).filter(
        (role): role is string => typeof role === "string",
      )
    : [];

  for (const role of [...claimedRoles, ...(claimedRole ? [claimedRole] : [])]) {
    if (role === "admin") {
      // Legacy alias used by early invitations.
      roles.add("super_admin");
    } else {
      roles.add(role);
    }
  }
  return [...roles];
}
