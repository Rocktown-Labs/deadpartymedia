import { and, eq, ne } from "drizzle-orm";
import { artmakers, artworks } from "@dpmedia/db/schema";
import type { NeonHttpDb } from "@dpmedia/db/http";

/**
 * Arts slug helpers, ported from apps/arts/src/lib/slug.ts plus the
 * makeUnique* helpers from the arts server functions. The DB instance is
 * passed explicitly (no module singleton in a Worker).
 */

const SLUG_SAFE_PATTERN = /[^a-z0-9]+/g;
const TRIM_DASH_PATTERN = /^-+|-+$/g;

export function createSlug(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(SLUG_SAFE_PATTERN, "-")
    .replace(TRIM_DASH_PATTERN, "");

  return slug || "artmaker";
}

export async function makeUniqueArtmakerSlug(
  db: NeonHttpDb,
  name: string,
  currentId?: number,
): Promise<string> {
  const baseSlug = createSlug(name);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await db
      .select({ id: artmakers.id })
      .from(artmakers)
      .where(
        currentId
          ? and(eq(artmakers.slug, candidate), ne(artmakers.id, currentId))
          : eq(artmakers.slug, candidate),
      )
      .limit(1);

    if (existing.length === 0) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function makeUniqueArtworkSlug(db: NeonHttpDb, title: string): Promise<string> {
  const baseSlug = createSlug(title);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await db
      .select({ id: artworks.id })
      .from(artworks)
      .where(eq(artworks.slug, candidate))
      .limit(1);

    if (existing.length === 0) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}
