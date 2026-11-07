import { createNeonHttpDb, type NeonHttpDb } from "@dpmedia/db/http";
import type { Bindings } from "./bindings";

/**
 * Per-isolate DB cache. `neon()` is a thin fetch wrapper, so creating a
 * client is cheap, but reusing one per isolate avoids repeated setup on
 * every request.
 */
let cached: { url: string; db: NeonHttpDb } | null = null;

export function getDb(env: Bindings): NeonHttpDb {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured for the API worker");
  }
  if (!cached || cached.url !== env.DATABASE_URL) {
    cached = { url: env.DATABASE_URL, db: createNeonHttpDb(env.DATABASE_URL) };
  }
  return cached.db;
}

/** Test helper — drop the isolate-level cache. */
export function resetDbCache(): void {
  cached = null;
}
