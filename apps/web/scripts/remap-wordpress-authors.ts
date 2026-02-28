import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, inArray } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

type CliOptions = {
  mapFile: string;
  dryRun: boolean;
  deletePlaceholders: boolean;
};

type AuthorMap = Record<string, string>;
const WORKSPACE_ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));

type RemapReport = {
  startedAt: string;
  completedAt: string | null;
  mapFile: string;
  dryRun: boolean;
  deletePlaceholders: boolean;
  mappingsProcessed: number;
  postsUpdated: number;
  placeholderUsersDeleted: number;
  failures: Array<{
    authorSlug: string;
    reason: string;
  }>;
};

function createDb(databaseUrl: string) {
  const client = neon(databaseUrl);
  return drizzle(client, { schema });
}

function parseCliArgs(argv: string[]): CliOptions {
  let mapFile: string | null = null;
  let dryRun = false;
  let deletePlaceholders = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--map-file") {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for --map-file");
      }
      mapFile = nextValue;
      index += 1;
      continue;
    }

    if (value === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (value === "--delete-placeholders") {
      deletePlaceholders = true;
      continue;
    }

    throw new Error(`Unknown argument: ${value}`);
  }

  if (!mapFile) {
    throw new Error("--map-file is required");
  }

  return {
    mapFile,
    dryRun,
    deletePlaceholders,
  };
}

async function loadAuthorMap(filePath: string): Promise<AuthorMap> {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const content = await fs.readFile(absolutePath, "utf8");
  const parsed = JSON.parse(content) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Author map file must contain a JSON object");
  }

  const result: AuthorMap = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Invalid target clerkId for author slug '${key}'`);
    }
    result[key.trim()] = value.trim();
  }

  return result;
}

async function writeReport(report: RemapReport): Promise<void> {
  const reportDir = path.resolve(WORKSPACE_ROOT, ".firecrawl");
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, "wordpress-author-remap-report.json");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));

  const report: RemapReport = {
    startedAt: new Date().toISOString(),
    completedAt: null,
    mapFile: options.mapFile,
    dryRun: options.dryRun,
    deletePlaceholders: options.deletePlaceholders,
    mappingsProcessed: 0,
    postsUpdated: 0,
    placeholderUsersDeleted: 0,
    failures: [],
  };

  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    const db = createDb(process.env.DATABASE_URL);
    const authorMap = await loadAuthorMap(options.mapFile);

    for (const [authorSlug, targetClerkId] of Object.entries(authorMap)) {
      report.mappingsProcessed += 1;

      try {
        const sourceRows = await db
          .select({ postId: schema.postImportSources.postId })
          .from(schema.postImportSources)
          .where(eq(schema.postImportSources.sourceAuthorSlug, authorSlug));

        const postIds = sourceRows.map((row) => row.postId);
        if (postIds.length === 0) {
          continue;
        }

        if (!options.dryRun) {
          await db
            .update(schema.posts)
            .set({ authorId: targetClerkId, updatedAt: new Date() })
            .where(inArray(schema.posts.id, postIds));
        }

        report.postsUpdated += postIds.length;

        if (options.deletePlaceholders && !options.dryRun) {
          const placeholderClerkId = `wp_placeholder:${authorSlug}`;
          const deletedRows = await db
            .delete(schema.users)
            .where(eq(schema.users.clerkId, placeholderClerkId))
            .returning({ id: schema.users.id });

          report.placeholderUsersDeleted += deletedRows.length;
        }
      } catch (error) {
        report.failures.push({
          authorSlug,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    report.completedAt = new Date().toISOString();
    await writeReport(report);

    console.log("[remap] Completed WordPress author remap.");
    console.log(
      `[remap] mappings=${report.mappingsProcessed}, postsUpdated=${report.postsUpdated}, failures=${report.failures.length}`,
    );
    console.log("[remap] Report written to .firecrawl/wordpress-author-remap-report.json");
  } catch (error) {
    report.completedAt = new Date().toISOString();
    await writeReport(report);

    const message = error instanceof Error ? error.message : String(error);
    console.error(`[remap] Fatal error: ${message}`);
    process.exitCode = 1;
  }
}

void main();
