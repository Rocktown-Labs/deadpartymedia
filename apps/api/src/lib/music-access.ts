import type { Context } from "hono";
import type { AppEnv } from "../bindings";
export function hasMusicRole(c: Context<AppEnv>, ...roles: string[]) {
  return c.get("auth")?.roles.some((role) => roles.includes(role)) ?? false;
}
export function canEditMusic(c: Context<AppEnv>, authorId: string) {
  const auth = c.get("auth");
  return (
    !!auth &&
    (hasMusicRole(c, "super_admin") || (hasMusicRole(c, "writer") && auth.userId === authorId))
  );
}
