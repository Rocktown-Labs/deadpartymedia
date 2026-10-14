import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { sanitizeAndTruncateExcerpt } from "../src/lib/admin/wordpress-backfill";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const apply = process.argv.includes("--apply");
  const client = neon(process.env.DATABASE_URL);
  const db = drizzle(client, { schema });

  console.log(
    `[truncate-excerpts] Mode: ${apply ? "APPLY (writing to database)" : "DRY RUN (pass --apply to execute)"}`,
  );
  console.log("[truncate-excerpts] Scanning posts with excerpt > 500 characters...");

  const longPosts = await db
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      slug: schema.posts.slug,
      excerpt: schema.posts.excerpt,
      length: sql<number>`length(${schema.posts.excerpt})`,
    })
    .from(schema.posts)
    .where(sql`length(${schema.posts.excerpt}) > 500`);

  console.log(
    `[truncate-excerpts] Found ${longPosts.length} post(s) with excerpts > 500 characters.`,
  );

  if (longPosts.length === 0) {
    console.log("[truncate-excerpts] No posts require excerpt truncation.");
    return;
  }

  let updatedCount = 0;

  for (const post of longPosts) {
    const nextExcerpt = sanitizeAndTruncateExcerpt(post.excerpt, 500);
    console.log(
      `[truncate-excerpts] Post #${post.id} (${post.slug}): length ${post.length} -> ${nextExcerpt.length} characters`,
    );

    if (apply) {
      await db
        .update(schema.posts)
        .set({
          excerpt: nextExcerpt,
          updatedAt: new Date(),
        })
        .where(eq(schema.posts.id, post.id));
      updatedCount++;
    }
  }

  if (apply) {
    console.log(`[truncate-excerpts] Successfully updated ${updatedCount} post excerpt(s).`);
  } else {
    console.log(
      `[truncate-excerpts] Dry run complete. To apply changes to ${longPosts.length} post(s), rerun with --apply:`,
    );
    console.log("  pnpm --filter web content:posts:truncate-excerpts --apply");
  }
}

main().catch((error) => {
  console.error("[truncate-excerpts] Fatal error:", error);
  process.exitCode = 1;
});
