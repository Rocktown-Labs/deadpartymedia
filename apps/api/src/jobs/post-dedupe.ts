import type { DedupeInput } from "@dpmedia/contracts";
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { Bindings } from "../bindings";
import { getMusicDb } from "../db";

import { backfillRuns, posts } from "@dpmedia/db/schema";
import { eq } from "drizzle-orm";
import { decodeHtmlEntities } from "../lib/music/utils/html";
export class PostDedupe extends WorkflowEntrypoint<Bindings, DedupeInput> {
  async run(event: WorkflowEvent<DedupeInput>, step: WorkflowStep) {
    const input = event.payload;
    const services = postDedupeWorkflowServices(this.env);

    try {
      // 1. Fetch all posts
      const allPosts = await step.do(
        "fetchAllPostsStep",
        { retries: { limit: 3, delay: "10 seconds", backoff: "exponential" } },
        () => services.fetchAllPostsStep(),
      );

      // 2. Scan and decode titles of all posts
      const decodedTitlesCount = await step.do(
        "decodeAllTitlesStep",
        { retries: { limit: 3, delay: "10 seconds", backoff: "exponential" } },
        () => services.decodeAllTitlesStep(allPosts),
      );

      // 3. Identify duplicate groups
      const dupeGroups = await step.do(
        "identifyDuplicatesStep",
        { retries: { limit: 3, delay: "10 seconds", backoff: "exponential" } },
        () => services.identifyDuplicatesStep(allPosts),
      );

      // Set total steps for progress reporting
      await step.do(
        "updateRunTotalPostsStep",
        { retries: { limit: 3, delay: "10 seconds", backoff: "exponential" } },
        () => services.updateRunTotalPostsStep(input.runId, dupeGroups.length),
      );

      // 4. Run deduplication for each group
      const results: Awaited<ReturnType<typeof services.dedupeGroupStep>>[] = [];
      let processedCount = 0;

      for (const group of dupeGroups) {
        const res = await step.do(
          `dedupeGroupStep-${processedCount}`,
          { retries: { limit: 3, delay: "10 seconds", backoff: "exponential" } },
          () => services.dedupeGroupStep(group),
        );
        results.push(res);
        processedCount++;
        await step.do(
          `updateRunProgressStep-${processedCount}`,
          { retries: { limit: 3, delay: "10 seconds", backoff: "exponential" } },
          () => services.updateRunProgressStep(input.runId, processedCount, results),
        );
      }

      // 5. Complete run
      await step.do(
        "completeRunStep",
        { retries: { limit: 3, delay: "10 seconds", backoff: "exponential" } },
        () => services.completeRunStep(input.runId, results, decodedTitlesCount),
      );

      return {
        decodedCount: decodedTitlesCount,
        processed: dupeGroups.length,
        results,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Post deduplication workflow failed for run ${input.runId}:`, errorMsg);
      await step.do(
        "failRunStep",
        { retries: { limit: 3, delay: "10 seconds", backoff: "exponential" } },
        () => services.failRunStep(input.runId, errorMsg),
      );
      throw error;
    }
  }
}
function postDedupeWorkflowServices(env: Bindings) {
  const db = getMusicDb(env);

  async function fetchAllPostsStep() {
    return await db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
      })
      .from(posts);
  }

  async function decodeAllTitlesStep(allPosts: any[]) {
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
    const originalId = group.originalId;
    const results: {
      dupeId: number;
      dupeTitle: string;
      status: "deduped" | "error";
      error?: string;
    }[] = [];
    for (const dupe of group.duplicates) {
      try {
        // Each duplicate's import source, relationships, comments and activity move together.
        await env.MUSIC_DB.batch([
          env.MUSIC_DB.prepare(
            "DELETE FROM post_import_sources WHERE post_id = ? AND EXISTS (SELECT 1 FROM post_import_sources WHERE post_id = ?)",
          ).bind(dupe.id, originalId),
          env.MUSIC_DB.prepare("UPDATE post_import_sources SET post_id = ? WHERE post_id = ?").bind(
            originalId,
            dupe.id,
          ),
          env.MUSIC_DB.prepare(
            "INSERT INTO post_artists (post_id, artist_id) SELECT ?, artist_id FROM post_artists source WHERE post_id = ? AND NOT EXISTS (SELECT 1 FROM post_artists target WHERE target.post_id = ? AND target.artist_id = source.artist_id)",
          ).bind(originalId, dupe.id, originalId),
          env.MUSIC_DB.prepare("DELETE FROM post_artists WHERE post_id = ?").bind(dupe.id),
          env.MUSIC_DB.prepare("UPDATE article_comments SET post_id = ? WHERE post_id = ?").bind(
            originalId,
            dupe.id,
          ),
          env.MUSIC_DB.prepare(
            "DELETE FROM user_article_reads WHERE post_id = ? AND clerk_user_id IN (SELECT clerk_user_id FROM user_article_reads WHERE post_id = ?)",
          ).bind(dupe.id, originalId),
          env.MUSIC_DB.prepare("UPDATE user_article_reads SET post_id = ? WHERE post_id = ?").bind(
            originalId,
            dupe.id,
          ),
          env.MUSIC_DB.prepare(
            "DELETE FROM user_article_saves WHERE post_id = ? AND clerk_user_id IN (SELECT clerk_user_id FROM user_article_saves WHERE post_id = ?)",
          ).bind(dupe.id, originalId),
          env.MUSIC_DB.prepare("UPDATE user_article_saves SET post_id = ? WHERE post_id = ?").bind(
            originalId,
            dupe.id,
          ),
          env.MUSIC_DB.prepare("DELETE FROM posts WHERE id = ?").bind(dupe.id),
        ]);
        results.push({ dupeId: dupe.id, dupeTitle: dupe.title, status: "deduped" });
      } catch (error) {
        results.push({
          dupeId: dupe.id,
          dupeTitle: dupe.title,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { title: group.title, originalId, duplicatesProcessed: results };
  }

  async function updateRunTotalPostsStep(runId: string, totalPosts: number) {
    await db
      .update(backfillRuns)
      .set({ totalPosts, updatedAt: new Date() })
      .where(eq(backfillRuns.runId, runId));
  }

  async function updateRunProgressStep(runId: string, processedPosts: number, results: any[]) {
    await db
      .update(backfillRuns)
      .set({ processedPosts, results, updatedAt: new Date() })
      .where(eq(backfillRuns.runId, runId));
  }

  async function completeRunStep(runId: string, results: any[], decodedTitlesCount: number) {
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
    await db
      .update(backfillRuns)
      .set({
        status: "failed",
        results: { error: errorMsg },
        updatedAt: new Date(),
      })
      .where(eq(backfillRuns.runId, runId));
  }
  return {
    fetchAllPostsStep,
    decodeAllTitlesStep,
    identifyDuplicatesStep,
    dedupeGroupStep,
    updateRunTotalPostsStep,
    updateRunProgressStep,
    completeRunStep,
    failRunStep,
  };
}
