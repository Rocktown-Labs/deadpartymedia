import { describe, expect, it } from "vite-plus/test";
import { Hono } from "hono";
import { clerkAuth, getRolesFromMetadata, requireAuth, requireRole } from "../src/auth";
import type { AppEnv } from "../src/bindings";

const env = {
  DATABASE_URL: "",
  CLERK_SECRET_KEY: "sk_test_missing",
  CLERK_PUBLISHABLE_KEY: "",
};

function protectedApp() {
  const app = new Hono<AppEnv>();
  app.use("*", clerkAuth());
  app.get("/me", (c) => c.json(requireAuth(c)));
  app.post("/admin-only", (c) => {
    requireRole(c, ["super_admin"]);
    return c.json({ ok: true });
  });
  return app;
}

describe("clerk auth middleware", () => {
  it("401s on protected routes without credentials", async () => {
    const app = protectedApp();
    const response = await app.request("/me", {}, env);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("401s when the bearer token cannot be verified", async () => {
    const app = protectedApp();
    const response = await app.request(
      "/me",
      { headers: { authorization: "Bearer not-a-real-jwt" } },
      env,
    );
    expect(response.status).toBe(401);
  });
});

describe("role parsing from Clerk claims", () => {
  it("maps legacy admin alias to super_admin", () => {
    expect(getRolesFromMetadata({ metadata: { role: "admin" } })).toEqual(["super_admin"]);
  });

  it("merges roles array and single role", () => {
    expect(
      getRolesFromMetadata({
        metadata: { role: "artist", roles: ["writer", "artist"] },
      }).sort(),
    ).toEqual(["artist", "writer"].sort());
  });

  it("returns empty for anonymous claims", () => {
    expect(getRolesFromMetadata({})).toEqual([]);
  });
});
