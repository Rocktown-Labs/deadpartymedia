import { env } from "cloudflare:test";
import { describe, expect, it } from "vite-plus/test";
import { getMusicDb } from "../src/db";
import { artists } from "@dpmedia/db/schema";
import { ensureUniqueSlug } from "../src/lib/slug";
describe("native D1 slug allocation", () => {
  it("keeps unique slugs and increments collisions while permitting an unchanged edit", async () => {
    const db = getMusicDb(env);
    expect(await ensureUniqueSlug(db, "studio", undefined, "artists")).toBe("studio");
    await db.insert(artists).values([
      { id: 501, name: "Studio", slug: "studio", genre: "OTHER", location: "AR", bio: "Bio" },
      { id: 502, name: "Studio Two", slug: "studio-1", genre: "OTHER", location: "AR", bio: "Bio" },
    ]);
    expect(await ensureUniqueSlug(db, "studio", undefined, "artists")).toBe("studio-2");
    expect(await ensureUniqueSlug(db, "studio", 501, "artists")).toBe("studio");
  });
});
