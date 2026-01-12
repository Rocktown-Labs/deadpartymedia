export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

export async function ensureUniqueSlug(
  slug: string,
  excludeId?: number,
  table?: "posts" | "events" | "artists"
): Promise<string> {
  const { db } = await import("@/lib/db");
  const { posts, events, artists } = await import("@/lib/db/schema");
  const { eq, and, ne } = await import("drizzle-orm");

  let uniqueSlug = slug;
  let counter = 1;

  // If table is specified, only check that table
  if (table) {
    const tableSchema = table === "posts" ? posts : table === "events" ? events : artists;
    while (true) {
      const existing = await db
        .select()
        .from(tableSchema)
        .where(
          excludeId
            ? and(eq(tableSchema.slug, uniqueSlug), ne(tableSchema.id, excludeId))
            : eq(tableSchema.slug, uniqueSlug)
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
            : eq(posts.slug, uniqueSlug)
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
        break; // Slug is unique across all tables
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
  }

  return uniqueSlug;
}
