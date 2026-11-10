import { createD1Database } from "@dpmedia/db/d1";
import type { Bindings } from "./bindings";

// Create request-local adapters; never cache request-bound Worker bindings globally.
export function getDb(env: Bindings) {
  return createD1Database(env.ARTS_DB);
}
export function getMusicDb(env: Bindings) {
  return createD1Database(env.MUSIC_DB);
}
