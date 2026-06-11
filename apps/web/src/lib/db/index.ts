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
  if (globalThis.__dbSanityCheckStarted) {
    return;
  }
  globalThis.__dbSanityCheckStarted = true;

  const columnResult = (await db.execute(sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'users' AND column_name IN ('role', 'onboarding_complete'))
        OR (table_name = 'posts' AND column_name = 'tags')
      )
  `)) as { rows?: { column_name: string; table_name: string }[] };

  const foundColumns = new Set(
    (columnResult.rows ?? []).map((row) => `${row.table_name}.${row.column_name}`),
  );

  const requiredColumns = ["users.role", "users.onboarding_complete", "posts.tags"] as const;
  const missingColumns = requiredColumns.filter((column) => !foundColumns.has(column));

  const tableResult = (await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('backfill_runs')
  `)) as { rows?: { table_name: string }[] };

  const foundTables = new Set((tableResult.rows ?? []).map((row) => row.table_name));
  const requiredTables = ["backfill_runs"] as const;
  const missingTables = requiredTables.filter((table) => !foundTables.has(table));

  if (missingColumns.length > 0 || missingTables.length > 0) {
    logger.error(
      {
        missingColumns,
        missingTables,
        operation: "startup_schema_sanity_check",
        tables: ["users", "posts", "backfill_runs"],
      },
      "Database schema is out of sync. Run migrations before serving traffic.",
    );

    throw new Error(
      `Startup schema sanity check failed: ${[
        missingColumns.length > 0 ? `missing columns: ${missingColumns.join(", ")}` : null,
        missingTables.length > 0 ? `missing tables: ${missingTables.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("; ")}`,
    );
  }

  logger.info(
    {
      operation: "startup_schema_sanity_check",
      tables: ["users", "posts", "backfill_runs"],
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
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    globalThis.__dbSanityCheckError = normalizedError;

    logger.error(
      {
        error: normalizedError.message,
        operation: "startup_schema_sanity_check",
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

      if (typeof process !== "undefined" && typeof process.exit === "function") {
        process.exit(1);
      }
    }
  });
}
