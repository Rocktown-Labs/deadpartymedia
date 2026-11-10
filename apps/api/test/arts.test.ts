import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vite-plus/test";
import { hc } from "hono/client";
import { app, type AppType } from "../src/index";

import { signUp as signedIn } from "./helpers";
function client(cookie = "") {
  return hc<AppType>("http://localhost:3000", {
    headers: { cookie },
    fetch: (input: RequestInfo | URL, init?: RequestInit) => app.request(input, init, env),
  });
}

describe("arts D1 and scoped Hono RPC", () => {
  let artist: Awaited<ReturnType<typeof signedIn>>;
  let musicWriter: Awaited<ReturnType<typeof signedIn>>;
  beforeAll(async () => {
    artist = await signedIn("artist@example.test");
    musicWriter = await signedIn("music-writer@example.test");
    await env.AUTH_DB.prepare(
      "INSERT INTO app_membership (user_id, app, role) VALUES (?, 'music', 'writer')",
    )
      .bind(musicWriter.userId)
      .run();
  });
  it("preserves inferred public route data and returns seeded database content", async () => {
    await env.ARTS_DB.prepare(
      "INSERT INTO artmakers (clerk_user_id, slug, name, city, phone_number, instagram_username, instagram_url, medium) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        "seed-person",
        "seed-artist",
        "Seed Artist",
        "Little Rock",
        "+15015551234",
        "seed",
        "https://instagram.com/seed",
        '["Painting"]',
      )
      .run();
    const response = await client().arts.artmakers.$get();
    expect(response.status).toBe(200);
    const rows = await response.json();
    expect(rows.find((row) => row.slug === "seed-artist")?.medium).toEqual(["Painting"]);
  });
  it("rejects a music writer at the arts staff boundary", async () => {
    const response = await client(musicWriter.cookie).arts.admin.overview.$get();
    expect(response.status).toBe(403);
  });
  it("does not grant arts content uploads to music-only members", async () => {
    const form = new FormData();
    form.set("file", new File(["image"], "test.png", { type: "image/png" }));
    const response = await app.request(
      "http://localhost:3000/arts/uploads/artwork",
      { method: "POST", headers: { cookie: musicWriter.cookie }, body: form },
      env,
    );
    expect(response.status).toBe(403);
  });
  it("creates a real profile through the validated RPC endpoint", async () => {
    const response = await client(artist.cookie).arts.artmakers.onboarding.artmaker.$post({
      json: {
        name: "Studio Artist",
        city: "Little Rock",
        state: "AR",
        phoneNumber: "+15015551234",
        medium: ["Painting"],
        instagramUsername: "studioartist",
        showPronouns: false,
      },
    });
    expect(response.status).toBe(200);
    const profile = await client(artist.cookie).arts.dashboard.artmaker.$get();
    const body = await profile.json();
    expect(body?.clerkUserId).toBe(artist.userId);
    expect(body?.name).toBe("Studio Artist");
    const roles = await env.AUTH_DB.prepare(
      "SELECT app, role FROM app_membership WHERE user_id = ?",
    )
      .bind(artist.userId)
      .all();
    expect(roles.results).toEqual([{ app: "arts", role: "artmaker" }]);
  });
  it("uploads native R2 media and saves the artmaker's artwork", async () => {
    const form = new FormData();
    form.set("file", new File(["artwork-image"], "painting.png", { type: "image/png" }));
    const upload = await app.request(
      "http://localhost:3000/arts/uploads/artwork",
      { method: "POST", headers: { cookie: artist.cookie }, body: form },
      env,
    );
    expect(upload.status).toBe(200);
    const media = (await upload.json()) as { key: string };
    expect(await (await env.ARTS_MEDIA.get(media.key))?.text()).toBe("artwork-image");
    const created = await client(artist.cookie).arts.dashboard.artworks.$post({
      json: {
        title: "Native Painting",
        imageKey: media.key,
        forSale: true,
        price: "12.50",
        status: "published",
        medium: "Acrylic",
        year: "2026",
      },
    });
    expect(created.status).toBe(200);
    const body = await created.json();
    expect(body.artwork.priceCents).toBe(1250);
    const listed = await client(artist.cookie).arts.dashboard.artworks.$get();
    expect((await listed.json()).some((row) => row.title === "Native Painting")).toBe(true);
  });
  it("does not permit anonymous writes", async () => {
    const response = await client().arts.admin.venues.$post({
      json: { name: "Venue", city: "Little Rock", state: "AR" },
    });
    expect(response.status).toBe(401);
  });
});
