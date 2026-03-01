import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, ne, or } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { extractPermalinkDate, isWordpressPostPermalink, parseWordpressArticle } from './lib/wordpress-parser';
import type { ParsedWordpressArticle } from './lib/wordpress-parser';
import { createImageMirror } from "./lib/image-mirror";

const execFileAsync = promisify(execFile);
const WORDPRESS_ROOT_URL = "https://deadpartymedia.wordpress.com/";
const DEFAULT_MAP_LIMIT = 500;
const DEFAULT_CONCURRENCY = 4;
const WORKSPACE_ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));

interface CliOptions {
  ownerClerkId: string;
  limit: number | null;
  since: Date | null;
  concurrency: number;
  dryRun: boolean;
}

interface FirecrawlScrapeResponse {
  html: string;
  metadata?: Record<string, unknown>;
}

type PreparedImportRecord = ParsedWordpressArticle & {
  mirroredCoverImageUrl: string | null;
  mirroredContentHtml: string;
  mirroredContentTiptapJson: string;
  inlineMirrorReplacedCount: number;
  inlineMirrorFailedCount: number;
};

interface ReportFailure {
  url: string;
  stage: "scrape" | "parse" | "cover_image" | "db";
  reason: string;
}

function createDb(databaseUrl: string) {
  const client = neon(databaseUrl);
  return drizzle(client, { schema });
}

type Database = ReturnType<typeof createDb>;

interface Report {
  startedAt: string;
  completedAt: string | null;
  options: {
    ownerClerkId: string;
    limit: number | null;
    since: string | null;
    concurrency: number;
    dryRun: boolean;
  };
  discoveredPermalinkCount: number;
  selectedPermalinkCount: number;
  scrapedCount: number;
  preparedCount: number;
  skippedBySinceCount: number;
  placeholderUsersCreated: number;
  placeholderUsersUpdated: number;
  postsInserted: number;
  postsUpdated: number;
  importSourcesInserted: number;
  importSourcesUpdated: number;
  inlineImagesMirrored: number;
  inlineImagesMirrorFailed: number;
  failures: ReportFailure[];
}

function parseCliArgs(argv: string[]): CliOptions {
  let ownerClerkId: string | null = null;
  let limit: number | null = null;
  let since: Date | null = null;
  let concurrency = DEFAULT_CONCURRENCY;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--owner-clerk-id") {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for --owner-clerk-id");
      }
      ownerClerkId = nextValue;
      index += 1;
      continue;
    }

    if (value === "--limit") {
      const nextValue = argv[index + 1];
      if (!nextValue) {throw new Error("Missing value for --limit");}
      const parsed = Number.parseInt(nextValue, 10);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error("--limit must be a positive integer");
      }
      limit = parsed;
      index += 1;
      continue;
    }

    if (value === "--since") {
      const nextValue = argv[index + 1];
      if (!nextValue) {throw new Error("Missing value for --since");}
      const parsedDate = new Date(nextValue);
      if (Number.isNaN(parsedDate.valueOf())) {
        throw new TypeError("--since must be a valid ISO date (e.g. 2025-01-01)");
      }
      since = parsedDate;
      index += 1;
      continue;
    }

    if (value === "--concurrency") {
      const nextValue = argv[index + 1];
      if (!nextValue) {throw new Error("Missing value for --concurrency");}
      const parsed = Number.parseInt(nextValue, 10);
      if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 20) {
        throw new Error("--concurrency must be an integer between 1 and 20");
      }
      concurrency = parsed;
      index += 1;
      continue;
    }

    if (value === "--dry-run") {
      dryRun = true;
      continue;
    }

    throw new Error(`Unknown argument: ${value}`);
  }

  if (!ownerClerkId) {
    throw new Error("--owner-clerk-id is required");
  }

  return {
    concurrency,
    dryRun,
    limit,
    ownerClerkId,
    since,
  };
}

function parseJsonFromOutput(rawOutput: string): unknown {
  const trimmed = rawOutput.trim();
  if (!trimmed) {
    throw new Error("Command returned empty output");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("Unable to parse JSON from command output");
  }
}

async function runFirecrawlJson(args: string[]): Promise<unknown> {
  try {
    const { stdout } = await execFileAsync("firecrawl", args, {
      maxBuffer: 50 * 1024 * 1024,
    });
    return parseJsonFromOutput(stdout);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`firecrawl ${args.join(" ")} failed: ${details}`, { cause: error });
  }
}

function extractMapLinks(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {return [];}

  const {data} = (payload as { data?: { links?: unknown[] } });
  if (!data || !Array.isArray(data.links)) {return [];}

  return data.links
    .map((value) => {
      if (typeof value === "string") {return value;}
      if (value && typeof value === "object") {
        const objectValue = value as { url?: unknown };
        if (typeof objectValue.url === "string") {return objectValue.url;}
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));
}

function extractScrapeResponse(payload: unknown, sourceUrl: string): FirecrawlScrapeResponse {
  if (!payload || typeof payload !== "object") {
    throw new Error(`Unexpected scrape payload for ${sourceUrl}`);
  }

  const direct = payload as { html?: unknown; metadata?: unknown };
  if (typeof direct.html === "string") {
    return {
      html: direct.html,
      metadata:
        direct.metadata && typeof direct.metadata === "object"
          ? (direct.metadata as Record<string, unknown>)
          : {},
    };
  }

  const wrapped = payload as { data?: unknown };
  if (wrapped.data && typeof wrapped.data === "object") {
    const data = wrapped.data as { html?: unknown; metadata?: unknown };
    if (typeof data.html === "string") {
      return {
        html: data.html,
        metadata:
          data.metadata && typeof data.metadata === "object"
            ? (data.metadata as Record<string, unknown>)
            : {},
      };
    }
  }

  throw new Error(`Unable to extract html from scrape payload for ${sourceUrl}`);
}

async function scrapeWordpressUrl(sourceUrl: string): Promise<FirecrawlScrapeResponse> {
  const payload = await runFirecrawlJson(["scrape", sourceUrl, "--format", "html", "--json"]);

  return extractScrapeResponse(payload, sourceUrl);
}

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of urls) {
    const normalized = value.endsWith("/") ? value : `${value}/`;
    if (seen.has(normalized)) {continue;}
    seen.add(normalized);
    deduped.push(value.endsWith("/") ? value.slice(0, -1) : value);
  }

  return deduped;
}

function toPlaceholderEmail(authorSlug: string): string {
  return `${authorSlug}@placeholder.deadpartymedia.local`;
}

function parseNameParts(authorName: string): { firstName: string; lastName: string | null } {
  const words = authorName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { firstName: "WordPress", lastName: "Writer" };
  }

  return {
    firstName: words[0] ?? "WordPress",
    lastName: words.slice(1).join(" ") || null,
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {return [];}

  const results = Array.from({ length: items.length }) as R[];
  let nextIndex = 0;

  async function runner() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex] as T, currentIndex);
    }
  }

  const runnerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: runnerCount }, () => runner()));

  return results;
}

async function resolveUniquePostSlug(
  db: Database,
  desiredSlug: string,
  excludePostId?: number,
): Promise<string> {
  let candidate = desiredSlug;
  let suffix = 1;

  while (true) {
    const rows = await db
      .select({ id: schema.posts.id })
      .from(schema.posts)
      .where(
        excludePostId
          ? and(eq(schema.posts.slug, candidate), ne(schema.posts.id, excludePostId))
          : eq(schema.posts.slug, candidate),
      )
      .limit(5);

    const hasConflict = rows.some((row) => row.id !== excludePostId);
    if (!hasConflict) {
      return candidate;
    }

    candidate = `${desiredSlug}-${suffix}`;
    suffix += 1;
  }
}

async function writeReport(report: Report): Promise<void> {
  const reportDir = path.resolve(WORKSPACE_ROOT, ".firecrawl");
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, "wordpress-backfill-report.json");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));

  const report: Report = {
    completedAt: null,
    discoveredPermalinkCount: 0,
    failures: [],
    importSourcesInserted: 0,
    importSourcesUpdated: 0,
    inlineImagesMirrorFailed: 0,
    inlineImagesMirrored: 0,
    options: {
      ownerClerkId: options.ownerClerkId,
      limit: options.limit,
      since: options.since?.toISOString() ?? null,
      concurrency: options.concurrency,
      dryRun: options.dryRun,
    },
    placeholderUsersCreated: 0,
    placeholderUsersUpdated: 0,
    postsInserted: 0,
    postsUpdated: 0,
    preparedCount: 0,
    scrapedCount: 0,
    selectedPermalinkCount: 0,
    skippedBySinceCount: 0,
    startedAt: new Date().toISOString(),
  };

  try {
    console.log("[backfill] Discovering WordPress URLs via firecrawl map...");
    const mappedPayload = await runFirecrawlJson([
      "map",
      WORDPRESS_ROOT_URL,
      "--limit",
      String(DEFAULT_MAP_LIMIT),
      "--json",
    ]);

    const mappedUrls = dedupeUrls(extractMapLinks(mappedPayload));
    const permalinkUrls = mappedUrls.filter((url) => isWordpressPostPermalink(url));
    report.discoveredPermalinkCount = permalinkUrls.length;

    let selectedUrls = permalinkUrls;

    if (options.since) {
      selectedUrls = selectedUrls.filter((url) => {
        const permalinkDate = extractPermalinkDate(url);
        if (!permalinkDate) {return false;}
        return permalinkDate >= options.since!;
      });
      report.skippedBySinceCount = permalinkUrls.length - selectedUrls.length;
    }

    if (options.limit) {
      selectedUrls = selectedUrls.slice(0, options.limit);
    }

    report.selectedPermalinkCount = selectedUrls.length;

    if (selectedUrls.length === 0) {
      console.log("[backfill] No permalink URLs matched the current filters.");
      report.completedAt = new Date().toISOString();
      await writeReport(report);
      return;
    }

    const imageMirror = createImageMirror({
      dryRun: options.dryRun,
      onWarn: (message, error) => {
        console.warn(`[backfill] ${message}`);
        if (error) {
          console.warn(`[backfill] ${String(error)}`);
        }
      },
    });

    console.log(`[backfill] Scraping ${selectedUrls.length} URLs...`);

    const scrapeResults = await runWithConcurrency(
      selectedUrls,
      options.concurrency,
      async (sourceUrl, index) => {
        const prefix = `[backfill][${index + 1}/${selectedUrls.length}]`;
        console.log(`${prefix} Scraping ${sourceUrl}`);

        try {
          const scraped = await scrapeWordpressUrl(sourceUrl);
          report.scrapedCount += 1;

          let parsed: ParsedWordpressArticle;
          try {
            parsed = parseWordpressArticle({
              html: scraped.html,
              metadata: scraped.metadata,
              sourceUrl,
            });
          } catch (error) {
            report.failures.push({
              reason: error instanceof Error ? error.message : String(error),
              stage: "parse",
              url: sourceUrl,
            });
            return null;
          }

          let mirroredCoverImageUrl: string | null = null;
          if (parsed.coverImageUrl) {
            try {
              mirroredCoverImageUrl = await imageMirror.mirrorImageUrl(
                parsed.coverImageUrl,
                "cover",
              );
            } catch (error) {
              report.failures.push({
                reason: error instanceof Error ? error.message : String(error),
                stage: "cover_image",
                url: sourceUrl,
              });
              return null;
            }
          }

          const inlineResult = await imageMirror.mirrorInlineImagesInHtml(
            parsed.contentHtml,
            parsed.sourceUrl,
          );
          const mirroredContentTiptapJson = JSON.stringify(
            generateJSON(inlineResult.html, [StarterKit, Image]),
          );

          report.inlineImagesMirrored += inlineResult.replacedCount;
          report.inlineImagesMirrorFailed += inlineResult.failedCount;

          const preparedRecord: PreparedImportRecord = {
            ...parsed,
            inlineMirrorFailedCount: inlineResult.failedCount,
            inlineMirrorReplacedCount: inlineResult.replacedCount,
            mirroredContentHtml: inlineResult.html,
            mirroredContentTiptapJson,
            mirroredCoverImageUrl,
          };

          return preparedRecord;
        } catch (error) {
          report.failures.push({
            reason: error instanceof Error ? error.message : String(error),
            stage: "scrape",
            url: sourceUrl,
          });
          return null;
        }
      },
    );

    const preparedRecords = scrapeResults.filter((value): value is PreparedImportRecord =>
      Boolean(value),
    );
    report.preparedCount = preparedRecords.length;

    if (options.dryRun) {
      console.log("[backfill] Dry run complete. No database writes were performed.");
      report.completedAt = new Date().toISOString();
      await writeReport(report);
      return;
    }

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required for non-dry-run imports");
    }

    const db = createDb(process.env.DATABASE_URL);

    const uniqueAuthors = new Map<string, string>();
    for (const record of preparedRecords) {
      if (!uniqueAuthors.has(record.authorSlug)) {
        uniqueAuthors.set(record.authorSlug, record.authorName);
      }
    }

    for (const [authorSlug, authorName] of uniqueAuthors) {
      const placeholderClerkId = `wp_placeholder:${authorSlug}`;
      const existingUser = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.clerkId, placeholderClerkId))
        .limit(1);

      const nameParts = parseNameParts(authorName);

      await db
        .insert(schema.users)
        .values({
          clerkId: placeholderClerkId,
          email: toPlaceholderEmail(authorSlug),
          firstName: nameParts.firstName,
          imageUrl: null,
          lastName: nameParts.lastName,
          onboardingComplete: true,
          role: "writer",
        })
        .onConflictDoUpdate({
          set: {
            email: toPlaceholderEmail(authorSlug),
            firstName: nameParts.firstName,
            lastName: nameParts.lastName,
            role: "writer",
            onboardingComplete: true,
            updatedAt: new Date(),
          },
          target: schema.users.clerkId,
        });

      if (existingUser.length > 0) {
        report.placeholderUsersUpdated += 1;
      } else {
        report.placeholderUsersCreated += 1;
      }
    }

    for (const record of preparedRecords) {
      try {
        const existingSource = await db
          .select({
            postId: schema.postImportSources.postId,
            sourceId: schema.postImportSources.id,
          })
          .from(schema.postImportSources)
          .where(eq(schema.postImportSources.sourceUrl, record.sourceUrl))
          .limit(1);

        let targetPostId: number | null = null;

        if (existingSource.length > 0) {
          targetPostId = existingSource[0]?.postId ?? null;
        }

        if (targetPostId) {
          await db
            .update(schema.posts)
            .set({
              category: record.category,
              content: record.mirroredContentTiptapJson,
              coverImage: record.mirroredCoverImageUrl,
              createdAt: record.sourcePublishedAt,
              excerpt: record.excerpt,
              isCoverStory: false,
              publishedAt: record.sourcePublishedAt,
              title: record.title,
              updatedAt: record.sourceModifiedAt ?? record.sourcePublishedAt,
            })
            .where(eq(schema.posts.id, targetPostId));

          report.postsUpdated += 1;
        } else {
          const uniqueSlug = await resolveUniquePostSlug(db, record.slug);
          const [insertedPost] = await db
            .insert(schema.posts)
            .values({
              authorId: options.ownerClerkId,
              category: record.category,
              content: record.mirroredContentTiptapJson,
              coverImage: record.mirroredCoverImageUrl,
              createdAt: record.sourcePublishedAt,
              excerpt: record.excerpt,
              isCoverStory: false,
              publishedAt: record.sourcePublishedAt,
              slug: uniqueSlug,
              status: "draft",
              title: record.title,
              updatedAt: record.sourceModifiedAt ?? record.sourcePublishedAt,
            })
            .returning({ id: schema.posts.id });

          targetPostId = insertedPost?.id ?? null;
          if (!targetPostId) {
            throw new Error(`Failed to insert post for ${record.sourceUrl}`);
          }

          report.postsInserted += 1;
        }

        const existingImportSource = await db
          .select({ id: schema.postImportSources.id })
          .from(schema.postImportSources)
          .where(
            or(
              eq(schema.postImportSources.postId, targetPostId),
              eq(schema.postImportSources.sourceUrl, record.sourceUrl),
            ),
          )
          .limit(1);

        if (existingImportSource.length > 0) {
          await db
            .update(schema.postImportSources)
            .set({
              postId: targetPostId,
              sourceAuthorSlug: record.authorSlug,
              sourceCategoriesJson: JSON.stringify(record.rawCategories),
              sourceModifiedAt: record.sourceModifiedAt,
              sourcePublishedAt: record.sourcePublishedAt,
              sourceUrl: record.sourceUrl,
              updatedAt: new Date(),
            })
            .where(eq(schema.postImportSources.id, existingImportSource[0]!.id));

          report.importSourcesUpdated += 1;
        } else {
          await db.insert(schema.postImportSources).values({
            postId: targetPostId,
            sourceAuthorSlug: record.authorSlug,
            sourceCategoriesJson: JSON.stringify(record.rawCategories),
            sourceModifiedAt: record.sourceModifiedAt,
            sourcePublishedAt: record.sourcePublishedAt,
            sourceUrl: record.sourceUrl,
            updatedAt: new Date(),
          });

          report.importSourcesInserted += 1;
        }
      } catch (error) {
        report.failures.push({
          reason: error instanceof Error ? error.message : String(error),
          stage: "db",
          url: record.sourceUrl,
        });
      }
    }

    report.completedAt = new Date().toISOString();
    await writeReport(report);

    console.log("[backfill] Import completed.");
    console.log(
      `[backfill] posts inserted=${report.postsInserted}, updated=${report.postsUpdated}, failures=${report.failures.length}`,
    );
    console.log("[backfill] Report written to .firecrawl/wordpress-backfill-report.json");
  } catch (error) {
    report.completedAt = new Date().toISOString();
    await writeReport(report);

    const message = error instanceof Error ? error.message : String(error);
    console.error(`[backfill] Fatal error: ${message}`);
    process.exitCode = 1;
  }
}

void main();
