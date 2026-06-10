import { start } from "workflow/api";
import { wordpressBackfillWorkflow } from "@/app/workflows/wordpress-backfill";
import { checkRole } from "@/lib/auth/roles";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Verify super admin role (since this triggers bulk background import)
  const isSuperAdmin = await checkRole("super_admin");
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { limit = 40, offset = 0, authorId, status = "published" } = body;

    if (!authorId) {
      return NextResponse.json({ error: "authorId is required" }, { status: 400 });
    }

    // Trigger the workflow
    const run = await start(wordpressBackfillWorkflow, [{
      limit,
      offset,
      authorId,
      status,
    }]);

    return NextResponse.json({
      success: true,
      runId: run.runId,
      message: "WordPress backfill background workflow started successfully.",
    });
  } catch (error) {
    console.error("Failed to start WordPress backfill workflow:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
