import { backfillRequestSchema } from "@dpmedia/contracts";
import { backfillRuns } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { requireRole } from "../../auth";
import type { AppEnv } from "../../bindings";
import { getMusicDb } from "../../db";
export const musicJobs = new Hono<AppEnv>()
  .post("/backfill", zValidator("json", backfillRequestSchema), async (c) => {
    requireRole(c, ["super_admin"]);
    const runId = crypto.randomUUID(),
      input = { ...c.req.valid("json"), runId },
      db = getMusicDb(c.env);
    await db.insert(backfillRuns).values({
      runId,
      status: "running",
      totalPosts: input.limit,
      processedPosts: 0,
      results: [],
    });
    try {
      await c.env.BACKFILL.create({ id: runId, params: input });
    } catch (error) {
      await db
        .update(backfillRuns)
        .set({
          status: "failed",
          results: { error: "Workflow could not be started" },
          updatedAt: new Date(),
        })
        .where(eq(backfillRuns.runId, runId));
      throw error;
    }
    return c.json({
      success: true as const,
      runId,
      workflowRunId: runId,
      message: "Backfill started",
    });
  })
  .post("/dedupe", async (c) => {
    requireRole(c, ["super_admin"]);
    const runId = crypto.randomUUID(),
      db = getMusicDb(c.env);
    await db
      .insert(backfillRuns)
      .values({ runId, status: "running", totalPosts: 0, processedPosts: 0, results: [] });
    try {
      await c.env.DEDUPE.create({ id: runId, params: { runId } });
    } catch (error) {
      await db
        .update(backfillRuns)
        .set({
          status: "failed",
          results: { error: "Workflow could not be started" },
          updatedAt: new Date(),
        })
        .where(eq(backfillRuns.runId, runId));
      throw error;
    }
    return c.json({
      success: true as const,
      runId,
      workflowRunId: runId,
      message: "Deduplication started",
    });
  })
  .get("/backfill/runs", async (c) => {
    requireRole(c, ["super_admin"]);
    const runs = await getMusicDb(c.env)
      .select()
      .from(backfillRuns)
      .orderBy(desc(backfillRuns.createdAt))
      .limit(50);
    return c.json({ success: true as const, runs });
  });
