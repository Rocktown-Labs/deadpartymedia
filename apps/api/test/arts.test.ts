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
    const served = await app.request(`http://localhost:3000/arts/media/${media.key}`, {}, env);
    expect(served.status).toBe(200);
    expect(await served.text()).toBe("artwork-image");
    const etag = served.headers.get("etag");
    expect(etag).toBeTruthy();
    const notModified = await app.request(
      `http://localhost:3000/arts/media/${media.key}`,
      { headers: { "if-none-match": etag! } },
      env,
    );
    expect(notModified.status).toBe(304);
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

    const photoArtwork = await client(artist.cookie).arts.dashboard.artworks.$post({
      json: {
        title: "Little Rock Street Film",
        imageKey: media.key,
        forSale: false,
        status: "published",
        medium: "Photography / Videography",
        videoUrl: "https://youtu.be/dQw4w9WgXcQ",
        year: "2026",
      },
    });
    expect(photoArtwork.status).toBe(200);
    const createdPhotoBody = await photoArtwork.json();
    expect(createdPhotoBody.artwork.videoUrl).toBe("https://youtu.be/dQw4w9WgXcQ");

    const photoWall = await client().arts.artworks.$get({
      query: { medium: "photography-videography" },
    });
    expect(photoWall.status).toBe(200);
    const photoWallBody = await photoWall.json();
    expect(photoWallBody.items.map((row) => row.title)).toEqual(["Little Rock Street Film"]);
    expect(photoWallBody.items[0]?.videoUrl).toBe("https://youtu.be/dQw4w9WgXcQ");
    expect(photoWallBody.groupCounts).toMatchObject({ "photography-videography": 1 });

    const updatedPhoto = await client(artist.cookie).arts.dashboard.artworks[":id"].$patch({
      param: { id: String(createdPhotoBody.artwork.id) },
      json: {
        title: "Little Rock Street Film",
        forSale: false,
        status: "published",
        medium: "Photography / Videography",
        videoUrl: "https://vimeo.com/123456789",
        year: "2026",
      },
    });
    expect(updatedPhoto.status).toBe(200);
    expect((await updatedPhoto.json()).artwork.videoUrl).toBe("https://vimeo.com/123456789");

    const clearedPhoto = await client(artist.cookie).arts.dashboard.artworks[":id"].$patch({
      param: { id: String(createdPhotoBody.artwork.id) },
      json: {
        title: "Little Rock Street Film",
        forSale: false,
        status: "published",
        medium: "Photography / Videography",
        videoUrl: "",
        year: "2026",
      },
    });
    expect(clearedPhoto.status).toBe(200);
    expect((await clearedPhoto.json()).artwork.videoUrl).toBeNull();

    const unsafeVideo = await client(artist.cookie).arts.dashboard.artworks.$post({
      json: {
        title: "Bad Video Link",
        imageKey: media.key,
        forSale: false,
        status: "published",
        medium: "Photography / Videography",
        videoUrl: "javascript:alert(1)",
        year: "2026",
      },
    });
    expect(unsafeVideo.status).toBe(400);
  });
  it("supports draft onboarding before step-2 artwork upload and preserves error messages", async () => {
    const onboardingUser = await signedIn("draft-artmaker@example.test");
    const draft = await client(onboardingUser.cookie).arts.artmakers.onboarding.artmaker.$post({
      json: {
        name: "Draft Artmaker",
        city: "Fayetteville",
        state: "AR",
        phoneNumber: "+15015559999",
        medium: ["Drawing"],
        instagramUsername: "draftartmaker",
        showPronouns: false,
        status: "draft",
      },
    });
    expect(draft.status).toBe(200);
    const draftBody = await draft.json();
    expect(draftBody.artmaker.status).toBe("draft");

    const form = new FormData();
    form.set("file", new File(["step-two"], "IMG_3602.jpeg", { type: "image/jpeg" }));
    const upload = await app.request(
      "http://localhost:3000/arts/uploads/artwork",
      { method: "POST", headers: { cookie: onboardingUser.cookie }, body: form },
      env,
    );
    expect(upload.status).toBe(200);

    const publish = await client(onboardingUser.cookie).arts.artmakers.onboarding.artmaker.$post({
      json: {
        name: "Draft Artmaker",
        city: "Fayetteville",
        state: "AR",
        phoneNumber: "+15015559999",
        medium: ["Drawing"],
        instagramUsername: "draftartmaker",
        showPronouns: false,
        status: "published",
      },
    });
    expect(publish.status).toBe(200);
    expect((await publish.json()).artmaker.status).toBe("published");

    const missingDelete = await client(onboardingUser.cookie).arts.dashboard.artworks[
      ":id"
    ].$delete({ param: { id: "999999" } });
    expect(missingDelete.status).toBe(404);
    expect(await missingDelete.json()).toEqual({ error: "Artwork not found" });
  });
  it("does not permit anonymous writes", async () => {
    const response = await client().arts.admin.venues.$post({
      json: { name: "Venue", city: "Little Rock", state: "AR" },
    });
    expect(response.status).toBe(401);
  });

  it("rejects non-numeric phone numbers and enforces unique Better Auth usernames", async () => {
    const badPhone = await client(artist.cookie).arts.artmakers.onboarding.artmaker.$post({
      json: {
        name: "Studio Artist",
        city: "Little Rock",
        state: "AR",
        phoneNumber: "501-abc-1234",
        medium: ["Painting"],
        instagramUsername: "studioartist",
        showPronouns: false,
      },
    });
    expect(badPhone.status).toBe(400);

    const checkFree = await app.request(
      "http://localhost:3000/api/auth/is-username-available",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "unique_maker" }),
      },
      env,
    );
    expect(checkFree.status).toBe(200);
    expect(await checkFree.json()).toEqual({ available: true });

    const claim = await app.request(
      "http://localhost:3000/api/auth/update-user",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: artist.cookie,
          origin: "http://localhost:3002",
        },
        body: JSON.stringify({ username: "unique_maker", displayUsername: "unique_maker" }),
      },
      env,
    );
    expect(claim.status).toBe(200);

    const checkTaken = await app.request(
      "http://localhost:3000/api/auth/is-username-available",
      {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3002" },
        body: JSON.stringify({ username: "unique_maker" }),
      },
      env,
    );
    expect(checkTaken.status).toBe(200);
    expect(await checkTaken.json()).toEqual({ available: false });

    const duplicateClaim = await app.request(
      "http://localhost:3000/api/auth/update-user",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: musicWriter.cookie,
          origin: "http://localhost:3002",
        },
        body: JSON.stringify({ username: "unique_maker" }),
      },
      env,
    );
    expect(duplicateClaim.status).toBeGreaterThanOrEqual(400);
  });
});
