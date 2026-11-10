import type { PlatformDatabase } from "@dpmedia/db/d1";
import { artists, events, musicReleases, posts, venues } from "@dpmedia/db/schema";
import { and, eq, ne } from "drizzle-orm";

/**
 * Ported from apps/web/src/lib/utils/slug.ts, with the db instance
 * passed explicitly (no module singleton in a Worker).
 */

export function generateSlug(title: string): string {
  const normalized = title
    .toLowerCase()
    .trim()
    .replaceAll(/[^\w\s-]/g, "")
    .replaceAll(/[\s_-]+/g, "-");

  let start = 0;
  while (start < normalized.length && normalized[start] === "-") {
    start += 1;
  }

  let end = normalized.length;
  while (end > start && normalized[end - 1] === "-") {
    end -= 1;
  }

  return normalized.slice(start, end);
}

export async function ensureUniqueSlug(
  db: PlatformDatabase,
  slug: string,
  excludeId?: number,
  table?: "posts" | "events" | "artists" | "venues" | "musicReleases",
): Promise<string> {
  let uniqueSlug = slug;
  let counter = 1;

  if (table) {
    const tableSchema =
      table === "posts"
        ? posts
        : table === "events"
          ? events
          : table === "venues"
            ? venues
            : table === "musicReleases"
              ? musicReleases
              : artists;
    while (true) {
      const existing = await db
        .select({ id: tableSchema.id, slug: tableSchema.slug })
        .from(tableSchema)
        .where(
          excludeId
            ? and(eq(tableSchema.slug, uniqueSlug), ne(tableSchema.id, excludeId))
            : eq(tableSchema.slug, uniqueSlug),
        )
        .limit(1);

      if (existing.length === 0) {
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
  } else {
    while (true) {
      const [existingPost] = await db
        .select({ id: posts.id })
        .from(posts)
        .where(
          excludeId
            ? and(eq(posts.slug, uniqueSlug), ne(posts.id, excludeId))
            : eq(posts.slug, uniqueSlug),
        )
        .limit(1);

      const [existingEvent] = await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.slug, uniqueSlug))
        .limit(1);

      const [existingArtist] = await db
        .select({ id: artists.id })
        .from(artists)
        .where(eq(artists.slug, uniqueSlug))
        .limit(1);

      if (!existingPost && !existingEvent && !existingArtist) {
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
  }

  return uniqueSlug;
}
