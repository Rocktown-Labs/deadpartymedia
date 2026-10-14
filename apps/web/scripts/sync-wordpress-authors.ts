import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { parseNameParts } from "../src/lib/admin/wordpress-backfill";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const apply = process.argv.includes("--apply");
  const client = neon(process.env.DATABASE_URL);
  const db = drizzle(client, { schema });

  console.log(
    `[sync-authors] Mode: ${apply ? "APPLY (writing to database)" : "DRY RUN (pass --apply to execute)"}`,
  );
  console.log("[sync-authors] Scanning imported posts from WordPress sources...");

  const importedPosts = await db
    .select({
      postId: schema.postImportSources.postId,
      sourceAuthorSlug: schema.postImportSources.sourceAuthorSlug,
      currentAuthorId: schema.posts.authorId,
      title: schema.posts.title,
    })
    .from(schema.postImportSources)
    .innerJoin(schema.posts, eq(schema.postImportSources.postId, schema.posts.id));

  console.log(`[sync-authors] Found ${importedPosts.length} imported post(s).`);

  const existingUsers = await db
    .select({
      clerkId: schema.users.clerkId,
      email: schema.users.email,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
    })
    .from(schema.users);

  const authorCache = new Map<string, string>();
  let usersCreated = 0;
  let postsToUpdate = 0;

  for (const post of importedPosts) {
    const slug = post.sourceAuthorSlug?.trim().toLowerCase();
    if (!slug) {
      continue;
    }

    let targetClerkId = authorCache.get(slug);

    if (!targetClerkId) {
      const placeholderClerkId = `wp_placeholder:${slug}`;
      const matched = existingUsers.find(
        (u) =>
          u.clerkId === placeholderClerkId ||
          u.clerkId === slug ||
          u.clerkId.toLowerCase() === `local_placeholder:${slug}` ||
          u.email.toLowerCase().startsWith(`${slug}@`),
      );

      if (matched) {
        targetClerkId = matched.clerkId;
      } else {
        targetClerkId = placeholderClerkId;
        const nameParts = parseNameParts(slug.replaceAll(/[-_]/g, " "));
        const placeholderEmail = `${slug}@placeholder.deadpartymedia.local`;

        if (apply) {
          const [inserted] = await db
            .insert(schema.users)
            .values({
              clerkId: placeholderClerkId,
              email: placeholderEmail,
              firstName: nameParts.firstName,
              imageUrl: null,
              lastName: nameParts.lastName,
              onboardingComplete: true,
              role: "writer",
            })
            .onConflictDoUpdate({
              target: schema.users.clerkId,
              set: {
                firstName: nameParts.firstName,
                lastName: nameParts.lastName,
                onboardingComplete: true,
                role: "writer",
                updatedAt: new Date(),
              },
            })
            .returning({ clerkId: schema.users.clerkId });

          targetClerkId = inserted?.clerkId || placeholderClerkId;
        }

        usersCreated++;
        existingUsers.push({
          clerkId: targetClerkId,
          email: placeholderEmail,
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
        });
      }

      authorCache.set(slug, targetClerkId);
    }

    if (post.currentAuthorId !== targetClerkId) {
      postsToUpdate++;
      console.log(
        `[sync-authors] Post #${post.postId} ("${post.title}"): authorId ${post.currentAuthorId} -> ${targetClerkId} (${slug})`,
      );

      if (apply) {
        await db
          .update(schema.posts)
          .set({
            authorId: targetClerkId,
            updatedAt: new Date(),
          })
          .where(eq(schema.posts.id, post.postId));
      }
    }
  }

  if (apply) {
    console.log(
      `[sync-authors] Successfully remapped ${postsToUpdate} post(s) and created ${usersCreated} writer(s).`,
    );
  } else {
    console.log(
      `[sync-authors] Dry run complete. Found ${postsToUpdate} post(s) to remap and ${usersCreated} writer profile(s) to create.`,
    );
    console.log("To apply changes, rerun with --apply:");
    console.log("  pnpm --filter web content:wordpress:sync-authors --apply");
  }
}

main().catch((error) => {
  console.error("[sync-authors] Fatal error:", error);
  process.exitCode = 1;
});
