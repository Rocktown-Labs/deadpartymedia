import { env } from "cloudflare:test";
import { describe, expect, it } from "vite-plus/test";
import { app } from "../src/index";

describe("calendar date data migration", () => {
  it("repairs imported event dates and preserves valid calendar dates in both databases", async () => {
    for (const [database, migrations] of [
      [env.ARTS_DB, env.ARTS_MIGRATIONS],
      [env.MUSIC_DB, env.MUSIC_MIGRATIONS],
    ] as const) {
      for (const [slug, date] of [
        ["imported-calendar", "1793336400000"],
        ["valid-calendar", "2026-11-20"],
      ]) {
        await database
          .prepare(
            "INSERT INTO events (title, slug, description, venue, location, date, genre, status, created_by_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            "Calendar fixture",
            slug,
            "Date regression",
            "Venue",
            "Arkansas",
            date,
            "OTHER",
            "published",
            "calendar-owner",
          )
          .run();
      }
      const repair = migrations.find((migration) =>
        migration.name.includes("normalize-event-calendar-dates"),
      );
      expect(repair).toBeDefined();
      for (const query of repair!.queries) await database.prepare(query).run();
      for (const query of repair!.queries) await database.prepare(query).run();
      const rows = await database
        .prepare(
          "SELECT slug, date FROM events WHERE slug IN ('imported-calendar', 'valid-calendar') ORDER BY slug",
        )
        .all();
      expect(rows.results).toEqual([
        { slug: "imported-calendar", date: "2026-10-30" },
        { slug: "valid-calendar", date: "2026-11-20" },
      ]);
    }
    const response = await app.request(
      "http://localhost:3000/music/events/imported-calendar",
      {},
      env,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ date: "2026-10-30" });
  });
});
