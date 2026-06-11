import { db } from "@/lib/db";
import {
  posts,
  postImportSources,
  postArtists,
  articleComments,
  userArticleReads,
  userArticleSaves,
  backfillRuns,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decodeHtmlEntities } from "@/lib/utils/html";

interface DedupeInput {
  runId: string;
}

export async function postDedupeWorkflow(input: DedupeInput) {
  "use workflow";

  try {
    // 1. Fetch all posts
    const allPosts = await fetchAllPostsStep();

    // 2. Scan and decode titles of all posts
    const decodedTitlesCount = await decodeAllTitlesStep(allPosts);

    // 3. Identify duplicate groups
    const dupeGroups = await identifyDuplicatesStep(allPosts);

    // Set total steps for progress reporting
    await updateRunTotalPostsStep(input.runId, dupeGroups.length);

    // 4. Run deduplication for each group
    const results = [];
    let processedCount = 0;

    for (const group of dupeGroups) {
      const res = await dedupeGroupStep(group);
      results.push(res);
      processedCount++;
      await updateRunProgressStep(input.runId, processedCount, results);
    }

    // 5. Complete run
    await completeRunStep(input.runId, results, decodedTitlesCount);

    return {
      decodedCount: decodedTitlesCount,
      processed: dupeGroups.length,
      results,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Post deduplication workflow failed for run ${input.runId}:`, errorMsg);
    await failRunStep(input.runId, errorMsg);
    throw error;
  }
}

async function fetchAllPostsStep() {
  "use step";
  return await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
    })
    .from(posts);
}

async function decodeAllTitlesStep(allPosts: any[]) {
  "use step";
  let decodedCount = 0;
  for (const post of allPosts) {
    const decoded = decodeHtmlEntities(post.title);
    if (decoded !== post.title) {
      await db
        .update(posts)
        .set({ title: decoded, updatedAt: new Date() })
        .where(eq(posts.id, post.id));
      // update the in-memory array for deduplication step
      post.title = decoded;
      decodedCount++;
    }
  }
  return decodedCount;
}

async function identifyDuplicatesStep(allPosts: any[]) {
  "use step";
  const groups = new Map<string, any[]>();
  for (const post of allPosts) {
    const norm = decodeHtmlEntities(post.title).toLowerCase().trim();
    let list = groups.get(norm);
    if (!list) {
      list = [];
      groups.set(norm, list);
    }
    list.push(post);
  }

  const dupeGroups = [];
  for (const [normTitle, list] of groups.entries()) {
    if (list.length > 1) {
      list.sort((a, b) => a.id - b.id);
      dupeGroups.push({
        title: normTitle,
        originalId: list[0].id,
        originalSlug: list[0].slug,
        duplicates: list.slice(1).map((d) => ({ id: d.id, slug: d.slug, title: d.title })),
      });
    }
  }
  return dupeGroups;
}

async function dedupeGroupStep(group: any) {
  "use step";
  const originalId = group.originalId;
  const results = [];

  for (const dupe of group.duplicates) {
    try {
      await db.transaction(async (tx) => {
        // 1. Move postImportSources
        const [origImport] = await tx
          .select()
          .from(postImportSources)
          .where(eq(postImportSources.postId, originalId))
          .limit(1);

        const [dupeImport] = await tx
          .select()
          .from(postImportSources)
          .where(eq(postImportSources.postId, dupe.id))
          .limit(1);

        if (dupeImport) {
          if (!origImport) {
            await tx
              .update(postImportSources)
              .set({ postId: originalId })
              .where(eq(postImportSources.id, dupeImport.id));
          } else {
            await tx.delete(postImportSources).where(eq(postImportSources.id, dupeImport.id));
          }
        }

        // 2. Move postArtists
        const origArtists = await tx
          .select({ artistId: postArtists.artistId })
          .from(postArtists)
          .where(eq(postArtists.postId, originalId));
        const origArtistIds = new Set(origArtists.map((a) => a.artistId));

        const dupeArtists = await tx
          .select({ artistId: postArtists.artistId })
          .from(postArtists)
          .where(eq(postArtists.postId, dupe.id));

        for (const da of dupeArtists) {
          if (!origArtistIds.has(da.artistId)) {
            await tx.insert(postArtists).values({ postId: originalId, artistId: da.artistId });
          }
        }
        await tx.delete(postArtists).where(eq(postArtists.postId, dupe.id));

        // 3. Move comments
        await tx
          .update(articleComments)
          .set({ postId: originalId })
          .where(eq(articleComments.postId, dupe.id));

        // 4. Move reads
        const reads = await tx
          .select()
          .from(userArticleReads)
          .where(eq(userArticleReads.postId, dupe.id));

        for (const read of reads) {
          const [exists] = await tx
            .select()
            .from(userArticleReads)
            .where(
              and(
                eq(userArticleReads.clerkUserId, read.clerkUserId),
                eq(userArticleReads.postId, originalId),
              ),
            )
            .limit(1);

          if (!exists) {
            await tx
              .update(userArticleReads)
              .set({ postId: originalId })
              .where(eq(userArticleReads.id, read.id));
          } else {
            await tx.delete(userArticleReads).where(eq(userArticleReads.id, read.id));
          }
        }

        // 5. Move saves
        const saves = await tx
          .select()
          .from(userArticleSaves)
          .where(eq(userArticleSaves.postId, dupe.id));

        for (const save of saves) {
          const [exists] = await tx
            .select()
            .from(userArticleSaves)
            .where(
              and(
                eq(userArticleSaves.clerkUserId, save.clerkUserId),
                eq(userArticleSaves.postId, originalId),
              ),
            )
            .limit(1);

          if (!exists) {
            await tx
              .update(userArticleSaves)
              .set({ postId: originalId })
              .where(eq(userArticleSaves.id, save.id));
          } else {
            await tx.delete(userArticleSaves).where(eq(userArticleSaves.id, save.id));
          }
        }

        // 6. Delete duplicate post
        await tx.delete(posts).where(eq(posts.id, dupe.id));
      });

      results.push({
        dupeId: dupe.id,
        dupeTitle: dupe.title,
        status: "deduped",
      });
    } catch (error) {
      console.error(`Failed to deduplicate post ${dupe.id}:`, error);
      results.push({
        dupeId: dupe.id,
        dupeTitle: dupe.title,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    title: group.title,
    originalId,
    duplicatesProcessed: results,
  };
}

async function updateRunTotalPostsStep(runId: string, totalPosts: number) {
  "use step";
  await db
    .update(backfillRuns)
    .set({ totalPosts, updatedAt: new Date() })
    .where(eq(backfillRuns.runId, runId));
}

async function updateRunProgressStep(runId: string, processedPosts: number, results: any[]) {
  "use step";
  await db
    .update(backfillRuns)
    .set({ processedPosts, results, updatedAt: new Date() })
    .where(eq(backfillRuns.runId, runId));
}

async function completeRunStep(runId: string, results: any[], decodedTitlesCount: number) {
  "use step";
  await db
    .update(backfillRuns)
    .set({
      status: "completed",
      results: {
        dedupeResults: results,
        decodedTitlesCount,
      },
      updatedAt: new Date(),
    })
    .where(eq(backfillRuns.runId, runId));
}

async function failRunStep(runId: string, errorMsg: string) {
  "use step";
  await db
    .update(backfillRuns)
    .set({
      status: "failed",
      results: { error: errorMsg },
      updatedAt: new Date(),
    })
    .where(eq(backfillRuns.runId, runId));
}
