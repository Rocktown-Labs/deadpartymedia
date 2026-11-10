import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
/** Public build configuration. Runtime credentials belong to the API Worker. */
export function readWebEnvironment(runtimeEnv: Record<string, string | number | boolean | undefined>) {
  return createEnv({ clientPrefix: "VITE_", client: { VITE_SITE_URL: z.url().optional() }, runtimeEnv, emptyStringAsUndefined: true });
}
