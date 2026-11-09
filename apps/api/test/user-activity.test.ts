import { describe, expect, it } from "vite-plus/test";
import { Hono } from "hono";
import { clerkAuth } from "../src/auth";
import { musicUserActivityRoutes } from "../src/routes/music/user-activity";
import type { AppEnv } from "../src/bindings";

/**
 * The source routes (apps/web/src/app/api/user/**) answer anonymous
 * requests with 401 { error: "Unauthorized" } before touching the
 * database, so these tests run fully offline.
 */
const env = {
  DATABASE_URL: "",
  CLERK_SECRET_KEY: "sk_test_missing",
  CLERK_PUBLISHABLE_KEY: "",
};

function activityApp() {
  const app = new Hono<AppEnv>();
  app.use("*", clerkAuth());
  app.route("/music", musicUserActivityRoutes);
  return app;
}

describe("user activity routes", () => {
  it("GET /music/user/stats without auth returns the source 401 body", async () => {
    const app = activityApp();
    const response = await app.request("/music/user/stats", {}, env);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("GET /music/user/articles/read without auth returns 401", async () => {
    const app = activityApp();
    const response = await app.request("/music/user/articles/read", {}, env);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("POST /music/user/articles/read without auth returns 401", async () => {
    const app = activityApp();
    const response = await app.request(
      "/music/user/articles/read",
      {
        body: JSON.stringify({ article_id: 1 }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      env,
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("GET /music/user/articles/saved without auth returns 401", async () => {
    const app = activityApp();
    const response = await app.request("/music/user/articles/saved", {}, env);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("DELETE /music/user/articles/saved/:id without auth returns 401", async () => {
    const app = activityApp();
    const response = await app.request("/music/user/articles/saved/1", { method: "DELETE" }, env);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("GET /music/user/comments without auth returns 401", async () => {
    const app = activityApp();
    const response = await app.request("/music/user/comments", {}, env);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});
