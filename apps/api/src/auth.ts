import { createAuth, createIdentityDatabase } from "@dpmedia/auth";
import { membership, user } from "@dpmedia/auth/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv, AuthContext, Bindings } from "./bindings";

type Application = "arts" | "music";
export function sessionAuth(app: Application): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    c.set("auth", null);
    const result = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
    if (result) {
      c.header("Cache-Control", "private, no-store");
      const roles = await getMembershipRoles(c.env, result.user.id, app);
      c.set("auth", {
        userId: result.user.id,
        roles,
        name: result.user.name,
        email: result.user.email,
        image: result.user.image ?? null,
      });
    }
    await next();
  };
}
export function getAuth(c: { get(key: "auth"): AuthContext | null }) {
  return c.get("auth");
}
export function requireAuth(c: { get(key: "auth"): AuthContext | null }) {
  const auth = getAuth(c);
  if (!auth) throw new HTTPException(401, { message: "Unauthorized" });
  return auth;
}
export function requireRole(c: { get(key: "auth"): AuthContext | null }, roles: readonly string[]) {
  const auth = requireAuth(c);
  if (!auth.roles.some((role) => roles.includes(role)))
    throw new HTTPException(403, { message: "Forbidden" });
  return auth;
}
export async function getMembershipRoles(env: Bindings, userId: string, app: Application) {
  const rows = await createIdentityDatabase(env.AUTH_DB)
    .select({ role: membership.role })
    .from(membership)
    .where(and(eq(membership.userId, userId), eq(membership.app, app)));
  const priority = [
    "super_admin",
    "arts_admin",
    "arts_writer",
    "writer",
    "artmaker",
    "artist",
    "venue",
    "fan",
  ];
  return rows.map((row) => row.role).sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
}
export async function setMembershipRoles(
  env: Bindings,
  userId: string,
  app: Application,
  roles: string[],
) {
  const db = createIdentityDatabase(env.AUTH_DB);
  const { isAppRole } = await import("@dpmedia/auth/roles");
  if (roles.some((role) => !isAppRole(app, role)))
    throw new HTTPException(400, { message: "Invalid application role" });
  const remove = db
    .delete(membership)
    .where(and(eq(membership.userId, userId), eq(membership.app, app)));
  const values = [...new Set(roles)].map((role) => ({ userId, app, role }));
  if (values.length) await db.batch([remove, db.insert(membership).values(values)]);
  else await remove;
}
export async function getIdentity(env: Bindings, userId: string) {
  const [identity] = await createIdentityDatabase(env.AUTH_DB)
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!identity) throw new HTTPException(404, { message: "User not found" });
  return identity;
}
export async function revokeSessions(env: Bindings, userIds: string[]) {
  const { session } = await import("@dpmedia/auth/schema");
  if (userIds.length)
    await createIdentityDatabase(env.AUTH_DB)
      .delete(session)
      .where(inArray(session.userId, userIds));
}

export async function setMusicAudienceRole(
  env: Bindings,
  userId: string,
  role: "fan" | "artist" | "venue",
) {
  const existing = await getMembershipRoles(env, userId, "music");
  await setMembershipRoles(env, userId, "music", [
    ...existing.filter((value) => value === "writer" || value === "super_admin"),
    role,
  ]);
}
