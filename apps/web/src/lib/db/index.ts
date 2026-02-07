import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { logger } from "@/lib/logger";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}
const client = neon(process.env.DATABASE_URL);

export const db = drizzle(client, { schema });

declare global {
  // eslint-disable-next-line no-var
  var __dbSanityCheckStarted: boolean | undefined;
  // eslint-disable-next-line no-var
  var __dbSanityCheckError: Error | undefined;
}

async function runStartupSchemaSanityCheck() {
  if (globalThis.__dbSanityCheckStarted) return;
  globalThis.__dbSanityCheckStarted = true;

  const result = (await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name IN ('role', 'onboarding_complete')
  `)) as { rows?: Array<{ column_name: string }> };

  const foundColumns = new Set(
    (result.rows ?? []).map((row) => row.column_name),
  );

  const requiredColumns = ["role", "onboarding_complete"] as const;
  const missingColumns = requiredColumns.filter(
    (column) => !foundColumns.has(column),
  );

  if (missingColumns.length > 0) {
    logger.error(
      {
        operation: "startup_schema_sanity_check",
        table: "users",
        missingColumns,
      },
      "Database schema is out of sync. Run migrations before serving traffic.",
    );

    throw new Error(
      `Startup schema sanity check failed: missing columns on users table: ${missingColumns.join(", ")}`,
    );
  }

  logger.info(
    {
      operation: "startup_schema_sanity_check",
      table: "users",
    },
    "Database schema sanity check passed",
  );
}

const shouldRunSchemaSanityCheck =
  process.env.DB_SCHEMA_SANITY_CHECK === "1" &&
  process.env.NODE_ENV !== "test" &&
  (process.env.NODE_ENV === "development" || process.env.CI === "true");

if (shouldRunSchemaSanityCheck) {
  void runStartupSchemaSanityCheck().catch((error) => {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));
    globalThis.__dbSanityCheckError = normalizedError;

    logger.error(
      {
        operation: "startup_schema_sanity_check",
        error: normalizedError.message,
      },
      "Startup schema sanity check failed",
    );

    if (process.env.CI === "true") {
      logger.error(
        {
          operation: "startup_schema_sanity_check",
        },
        "Failing fast because startup schema sanity check failed in CI",
      );

      if (
        typeof process !== "undefined" &&
        typeof process.exit === "function"
      ) {
        process.exit(1);
      }
    }
  });
}
