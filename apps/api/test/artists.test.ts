import { describe, expect, it } from "vite-plus/test";
import { Hono } from "hono";
import { clerkAuth } from "../src/auth";
import { musicArtistsRoutes } from "../src/routes/music/artists";
import type { AppEnv } from "../src/bindings";

/**
 * Network-free tests for the ported artist routes
 * (apps/web/src/app/api/artists/*). The router is mounted here the same
 * way src/routes/music/index.ts mounts it (`/music/artists`).
 *
 * A DATABASE_URL of "" makes getDb() throw synchronously, so the routes
 * exercise their catch branches without ever opening a connection.
 */
const env = {
  DATABASE_URL: "",
  CLERK_SECRET_KEY: "sk_test_missing",
  CLERK_PUBLISHABLE_KEY: "",
};

function app() {
  const testApp = new Hono<AppEnv>();
  testApp.use("*", clerkAuth());
  testApp.route("/music/artists", musicArtistsRoutes);
  return testApp;
}

describe("GET /music/artists/me", () => {
  it("401s without auth, with the source's exact 401 body", async () => {
    const response = await app().request("/music/artists/me", {}, env);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("matches /me before /:slug (an unmatched /me would hit the DB and 500)", async () => {
    const response = await app().request("/music/artists/me", {}, env);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});

describe("PATCH /music/artists/me", () => {
  it("401s without auth, with the source's exact 401 body", async () => {
    const response = await app().request("/music/artists/me", { method: "PATCH" }, env);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("401s when the bearer token cannot be verified", async () => {
    const response = await app().request(
      "/music/artists/me",
      { method: "PATCH", headers: { authorization: "Bearer not-a-real-jwt" } },
      env,
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});

describe("GET /music/artists", () => {
  it("returns the source's 500 error body when the DB is unavailable", async () => {
    const response = await app().request("/music/artists", {}, env);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to fetch artists" });
  });
});
