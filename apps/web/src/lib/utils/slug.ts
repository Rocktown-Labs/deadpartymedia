export function generateSlug(title: string): string {
  const normalized = title
    .toLowerCase()
    .trim()
    // Remove special characters
    .replaceAll(/[^\w\s-]/g, "")
    // Replace spaces and underscores with hyphens
    .replaceAll(/[\s_-]+/g, "-");

  // Trim hyphens with bounded scans instead of a backtracking-prone regex.
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
  slug: string,
  excludeId?: number,
  table?: "posts" | "events" | "artists" | "venues" | "musicReleases",
): Promise<string> {
  const { db } = await import("@/lib/db");
  const { posts, events, artists, venues, musicReleases } = await import("@/lib/db/schema");
  const { eq, and, ne } = await import("drizzle-orm");

  let uniqueSlug = slug;
  let counter = 1;

  // If table is specified, only check that table

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
        .select()
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
    // Check all tables if no table specified

    while (true) {
      const [existingPost] = await db
        .select()
        .from(posts)
        .where(
          excludeId
            ? and(eq(posts.slug, uniqueSlug), ne(posts.id, excludeId))
            : eq(posts.slug, uniqueSlug),
        )
        .limit(1);

      const [existingEvent] = await db
        .select()
        .from(events)
        .where(eq(events.slug, uniqueSlug))
        .limit(1);

      const [existingArtist] = await db
        .select()
        .from(artists)
        .where(eq(artists.slug, uniqueSlug))
        .limit(1);

      if (!existingPost && !existingEvent && !existingArtist) {
        // Slug is unique across all tables
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
  }

  return uniqueSlug;
}
