import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Workers-safe Drizzle client over the Neon serverless HTTP driver.
 *
 * Use this from edge/Workers environments (apps/api). It connects over
 * `fetch` only — unlike the default `@dpmedia/db` export (node-postgres
 * Pool), importing this module never pulls `pg` into a worker bundle.
 */
export function createNeonHttpDb(connectionString: string) {
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

export type NeonHttpDb = ReturnType<typeof createNeonHttpDb>;
