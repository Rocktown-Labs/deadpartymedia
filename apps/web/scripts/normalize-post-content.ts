import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { desc, eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import {
  normalizeStoredPostContent,
  type NormalizedPostContentKind,
} from "../src/lib/content/post-content";

type CliOptions = {
  apply: boolean;
  limit: number | null;
  importedOnly: boolean;
};

type ReportEntry = {
  postId: number;
  slug: string;
  kind: NormalizedPostContentKind;
  changed: boolean;
};

type Report = {
  startedAt: string;
  completedAt: string | null;
  options: {
    apply: boolean;
    limit: number | null;
    importedOnly: boolean;
  };
  scannedCount: number;
  malformedCount: number;
  updatedCount: number;
  byKind: Record<NormalizedPostContentKind, number>;
  sample: ReportEntry[];
};

const WORKSPACE_ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));

function createDb(databaseUrl: string) {
  const client = neon(databaseUrl);
  return drizzle(client, { schema });
}

function parseCliArgs(argv: string[]): CliOptions {
  let apply = false;
  let limit: number | null = null;
  let importedOnly = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--apply") {
      apply = true;
      continue;
    }

    if (value === "--limit") {
      const nextValue = argv[index + 1];
      if (!nextValue) throw new Error("Missing value for --limit");
      const parsed = Number.parseInt(nextValue, 10);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error("--limit must be a positive integer");
      }
      limit = parsed;
      index += 1;
      continue;
    }

    if (value === "--imported-only") {
      importedOnly = true;
      continue;
    }

    throw new Error(`Unknown argument: ${value}`);
  }

  return { apply, limit, importedOnly };
}

async function writeReport(report: Report): Promise<void> {
  const reportDir = path.resolve(WORKSPACE_ROOT, ".firecrawl");
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, "post-content-normalization-report.json");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const db = createDb(process.env.DATABASE_URL);

  const report: Report = {
    startedAt: new Date().toISOString(),
    completedAt: null,
    options,
    scannedCount: 0,
    malformedCount: 0,
    updatedCount: 0,
    byKind: {
      tiptap_json: 0,
      nested_tiptap_json: 0,
      stringified_tiptap_json: 0,
      html_or_text: 0,
    },
    sample: [],
  };

  try {
    const baseSelect = {
      id: schema.posts.id,
      slug: schema.posts.slug,
      content: schema.posts.content,
    };

    let rows: Array<{ id: number; slug: string; content: string }>;
    if (options.importedOnly) {
      const query = db
        .select(baseSelect)
        .from(schema.posts)
        .innerJoin(
          schema.postImportSources,
          eq(schema.postImportSources.postId, schema.posts.id),
        )
        .orderBy(desc(schema.posts.id));
      rows = options.limit ? await query.limit(options.limit) : await query;
    } else {
      const query = db.select(baseSelect).from(schema.posts).orderBy(desc(schema.posts.id));
      rows = options.limit ? await query.limit(options.limit) : await query;
    }

    report.scannedCount = rows.length;

    for (const row of rows) {
      const normalized = normalizeStoredPostContent(row.content);
      report.byKind[normalized.kind] += 1;

      if (normalized.changed) {
        report.malformedCount += 1;
      }

      if (report.sample.length < 100 && (normalized.changed || normalized.kind !== "html_or_text")) {
        report.sample.push({
          postId: row.id,
          slug: row.slug,
          kind: normalized.kind,
          changed: normalized.changed,
        });
      }

      if (options.apply && normalized.changed) {
        await db
          .update(schema.posts)
          .set({
            content: normalized.canonicalStorage,
            updatedAt: new Date(),
          })
          .where(eq(schema.posts.id, row.id));
        report.updatedCount += 1;
      }
    }

    report.completedAt = new Date().toISOString();
    await writeReport(report);

    console.log(
      `[normalize-post-content] scanned=${report.scannedCount}, malformed=${report.malformedCount}, updated=${report.updatedCount}`,
    );
    console.log(
      "[normalize-post-content] Report written to .firecrawl/post-content-normalization-report.json",
    );
  } catch (error) {
    report.completedAt = new Date().toISOString();
    await writeReport(report);

    const message = error instanceof Error ? error.message : String(error);
    console.error(`[normalize-post-content] Fatal error: ${message}`);
    process.exitCode = 1;
  }
}

void main();
