import { start } from "workflow/api";
import { postDedupeWorkflow } from "@/app/workflows/post-dedupe";
import { checkRole } from "@/lib/auth/roles";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { backfillRuns } from "@/lib/db/schema";

export async function POST(_request: Request) {
  // Verify super admin role
  const isSuperAdmin = await checkRole("super_admin");
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const runId = `dedupe-${crypto.randomUUID()}`;

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

    return NextResponse.json({
      success: true,
      runId,
      workflowRunId: run.runId,
      message: "Post deduplication background workflow started successfully.",
    });
  } catch (error) {
    console.error("Failed to start post deduplication workflow:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
