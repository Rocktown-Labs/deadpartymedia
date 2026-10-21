import { start } from "workflow/api";
import { postDedupeWorkflow } from "@/app/workflows/post-dedupe";
import { checkRole } from "@/lib/auth/roles";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { backfillRuns } from "@/lib/db/schema";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function POST(request: NextRequest) {
  const log = getRequestLogger(request);

  // Verify super admin role
  const isSuperAdmin = await checkRole("super_admin");
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let runId: string | undefined;
  try {
    runId = `dedupe-${crypto.randomUUID()}`;

    // Record the run in the database
    await db.insert(backfillRuns).values({
      runId,
      status: "running",
      totalPosts: 0,
      processedPosts: 0,
      results: {},
    });

    // Trigger the workflow
    const run = await start(postDedupeWorkflow, [{ runId }]);

    log.info({ runId, workflowRunId: run.runId }, "Started post deduplication workflow");

    return NextResponse.json({
      success: true,
      runId,
      workflowRunId: run.runId,
      message: "Post deduplication background workflow started successfully.",
    });
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "start_post_dedupe", runId },
      "Failed to start post deduplication workflow",
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
