import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { decodeHtmlEntities } from "../src/lib/utils/html";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const client = neon(process.env.DATABASE_URL);
  const db = drizzle(client, { schema });

  console.log("Fetching posts...");
  const allPosts = await db
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      slug: schema.posts.slug,
    })
    .from(schema.posts);

  console.log(`Scanned ${allPosts.length} posts.`);

  let updatedCount = 0;

  for (const post of allPosts) {
    const decodedTitle = decodeHtmlEntities(post.title);
    if (decodedTitle !== post.title) {
      console.log(`Updating post [${post.id}]: "${post.title}" -> "${decodedTitle}"`);
      await db
        .update(schema.posts)
        .set({
          title: decodedTitle,
          updatedAt: new Date(),
        })
        .where(eq(schema.posts.id, post.id));
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} post titles.`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
