import { start } from "workflow/api";
import { wordpressBackfillWorkflow } from "@/app/workflows/wordpress-backfill";
import { checkRole } from "@/lib/auth/roles";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { backfillRuns } from "@/lib/db/schema";

export async function POST(request: Request) {
  // Verify super admin role (since this triggers bulk background import)
  const isSuperAdmin = await checkRole("super_admin");
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { limit = 40, offset = 0, authorId, status = "published", source = "wordpress" } = body;

    if (!authorId) {
      return NextResponse.json({ error: "authorId is required" }, { status: 400 });
    }
    if (status !== "draft" && status !== "published") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (source !== "wordpress" && source !== "local_drafts") {
      return NextResponse.json({ error: "Invalid backfill source" }, { status: 400 });
    }

    // Generate our own unique tracker runId
    const runId = crypto.randomUUID();

    // Record the run in the database
    await db.insert(backfillRuns).values({
      runId,
      status: "running",
      totalPosts: limit,
      processedPosts: 0,
      results: [],
    });

    // Trigger the workflow and pass our runId
    const run = await start(wordpressBackfillWorkflow, [
      {
        limit,
        offset,
        authorId,
        status,
        runId,
        source,
      },
    ]);

    return NextResponse.json({
      success: true,
      runId,
      workflowRunId: run.runId,
      message:
        source === "local_drafts"
          ? "Local draft reprocessing workflow started successfully."
          : "WordPress backfill background workflow started successfully.",
    });
  } catch (error) {
    console.error("Failed to start WordPress backfill workflow:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
