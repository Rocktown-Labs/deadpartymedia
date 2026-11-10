import type { ArtsApiType } from "api";
import { hc } from "hono/client";

/** Type-only API import: no database, secrets or Worker runtime in client bundles. */
export function createArtsClient(baseUrl: string, options?: Parameters<typeof hc>[1]) {
  return hc<ArtsApiType>(baseUrl, options);
}
export type ArtsClient = ReturnType<typeof createArtsClient>;
