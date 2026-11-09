import { describe, expect, it } from "vite-plus/test";
import { Hono } from "hono";
import { clerkAuth } from "../src/auth";
import { artsAdminRoutes } from "../src/routes/arts/admin";
import type { AppEnv } from "../src/bindings";

const env = {
  DATABASE_URL: "",
  CLERK_SECRET_KEY: "sk_test_missing",
  CLERK_PUBLISHABLE_KEY: "",
};

function artsAdminApp() {
  const app = new Hono<AppEnv>();
  app.use("*", clerkAuth());
  app.route("/arts", artsAdminRoutes);
  return app;
}

describe("arts admin auth", () => {
  it("401s on GET /arts/admin/overview without credentials", async () => {
    const app = artsAdminApp();
    const response = await app.request("/arts/admin/overview", {}, env);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("401s on GET /arts/admin/overview with a garbage bearer token", async () => {
    const app = artsAdminApp();
    const response = await app.request(
      "/arts/admin/overview",
      { headers: { authorization: "Bearer not-a-real-jwt" } },
      env,
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});
