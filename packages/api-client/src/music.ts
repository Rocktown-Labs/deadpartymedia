import type { MusicApiType } from "api";
import { hc } from "hono/client";

/** Type-only API import: no database, secrets or Worker runtime in client bundles. */
export function createMusicClient(baseUrl: string, options?: Parameters<typeof hc>[1]) {
  return hc<MusicApiType>(baseUrl, options);
}
export type MusicClient = ReturnType<typeof createMusicClient>;
