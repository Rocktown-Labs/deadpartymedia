import { describe, expect, it } from "vite-plus/test";
import { Hono } from "hono";
import { clerkAuth } from "../src/auth";
import type { AppEnv } from "../src/bindings";
import { artsArtmakersRoutes } from "../src/routes/arts/artmakers";
import { artsArtworksRoutes } from "../src/routes/arts/artworks";

/**
 * /arts router auth + validation tests. Mirrors the production wiring
 * (clerkAuth middleware + routers mounted under /arts) without any network:
 * DATABASE_URL is empty, so any handler that reached the DB would throw —
 * the tests assert on the guard/validation layers that run before it.
 */

const env = {
  DATABASE_URL: "",
  CLERK_SECRET_KEY: "sk_test_missing",
  CLERK_PUBLISHABLE_KEY: "",
};

function artsApp() {
  const app = new Hono<AppEnv>();
  app.use("*", clerkAuth());
  app.route("/arts", artsArtmakersRoutes);
  app.route("/arts", artsArtworksRoutes);
  return app;
}

describe("arts protected endpoints", () => {
  it("401s on POST /arts/dashboard/artworks without credentials", async () => {
    const app = artsApp();
    const response = await app.request(
      "/arts/dashboard/artworks",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Untitled",
          forSale: false,
          image: "https://example.com/artwork.png",
        }),
      },
      env,
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("401s on GET /arts/admin/artmakers without credentials", async () => {
    const app = artsApp();
    const response = await app.request("/arts/admin/artmakers", {}, env);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("401s on a garbage bearer token", async () => {
    const app = artsApp();
    const response = await app.request(
      "/arts/admin/artmakers",
      { headers: { authorization: "Bearer not-a-real-jwt" } },
      env,
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("401s on POST /arts/artmakers/onboarding/artmaker without credentials", async () => {
    const app = artsApp();
    const response = await app.request(
      "/arts/artmakers/onboarding/artmaker",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          city: "Little Rock",
          instagramUsername: "@example",
          medium: ["Painting"],
          name: "Example Artmaker",
          phoneNumber: "+15015550100",
          showPronouns: false,
          state: "AR",
        }),
      },
      env,
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});

describe("arts public endpoint validation", () => {
  it("400s on GET /arts/artworks with an out-of-range limit before touching the DB", async () => {
    const app = artsApp();
    const response = await app.request("/arts/artworks?limit=0", {}, env);
    expect(response.status).toBe(400);
    const { error } = (await response.json()) as { error: string };
    expect(typeof error).toBe("string");
    expect(error.length).toBeGreaterThan(0);
  });

  it("400s on GET /arts/artworks with an unknown sort before touching the DB", async () => {
    const app = artsApp();
    const response = await app.request("/arts/artworks?sort=bogus", {}, env);
    expect(response.status).toBe(400);
    const { error } = (await response.json()) as { error: string };
    expect(typeof error).toBe("string");
    expect(error.length).toBeGreaterThan(0);
  });

  it("returns the degraded paginated shape when the DB is unavailable", async () => {
    const app = artsApp();
    const response = await app.request("/arts/artworks", {}, env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [],
      nextOffset: null,
      totalCount: 0,
      groupCounts: {},
    });
  });

  it("returns null for an artwork detail lookup when the DB is unavailable", async () => {
    const app = artsApp();
    const response = await app.request("/arts/artworks/123", {}, env);
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it("degrades the by-artmaker artwork list to an empty array when the DB is unavailable", async () => {
    const app = artsApp();
    const response = await app.request("/arts/artworks/by-artmaker/jane-doe", {}, env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("degrades the artmaker profile lookup to null when the DB is unavailable", async () => {
    const app = artsApp();
    const response = await app.request("/arts/artmakers/jane-doe", {}, env);
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it("degrades the public artmaker list to an empty array when the DB is unavailable", async () => {
    const app = artsApp();
    const response = await app.request("/arts/artmakers", {}, env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("reports a failed profile-view as {success: false} instead of erroring", async () => {
    const app = artsApp();
    const response = await app.request(
      "/arts/artmakers/someone/profile-view",
      {
        method: "POST",
      },
      env,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: false, profileViews: null });
  });
});
