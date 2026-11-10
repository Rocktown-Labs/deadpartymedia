import { drizzle } from "drizzle-orm/d1";
import type { D1Database as D1Binding } from "@cloudflare/workers-types";

export function createD1Database(binding: D1Binding) {
  return drizzle(binding);
}
export type PlatformDatabase = ReturnType<typeof createD1Database>;

export type D1Database = ReturnType<typeof createD1Database>;
