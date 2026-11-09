import { describe, expect, it } from "vite-plus/test";
import { Hono } from "hono";
import { clerkAuth } from "../src/auth";
import { musicEventsRoutes } from "../src/routes/music/events";
import type { AppEnv } from "../src/bindings";

/**
 * Network-free tests for the ported events routes
 * (apps/web/src/app/api/events/*). The routers are mounted here the same
 * way src/routes/music/index.ts mounts them (`/music/events`).
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
  testApp.route("/music/events", musicEventsRoutes);
  return testApp;
}

describe("POST /music/events (submit a show)", () => {
  it("401s without auth, with the source's exact 401 body", async () => {
    const response = await app().request("/music/events", { method: "POST" }, env);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required" });
  });

  it("401s when the bearer token cannot be verified (anonymous → 401 before validation)", async () => {
    const response = await app().request(
      "/music/events",
      {
        method: "POST",
        headers: {
          authorization: "Bearer not-a-real-jwt",
          "content-type": "application/json",
        },
        body: JSON.stringify({ title: "Test Show", date: "2026-11-07", venue: "Test Venue" }),
      },
      env,
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required" });
  });
});

describe("GET /music/events", () => {
  it("returns the source's 500 error body when the DB is unavailable", async () => {
    const response = await app().request("/music/events", {}, env);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to fetch events" });
  });
});

describe("GET /music/events/:slug", () => {
  it("returns the source's 500 error body when the DB is unavailable", async () => {
    const response = await app().request("/music/events/some-show", {}, env);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to fetch event" });
  });
});
