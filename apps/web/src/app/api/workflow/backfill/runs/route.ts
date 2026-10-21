import { checkRole } from "@/lib/auth/roles";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { backfillRuns } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const log = getRequestLogger(request);

  // Verify super admin role
  const isSuperAdmin = await checkRole("super_admin");
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // limit to last 50 runs
    const runs = await db
      .select()
      .from(backfillRuns)
      .orderBy(desc(backfillRuns.createdAt))
      .limit(50);

    return NextResponse.json({
      success: true,
      runs,
    });
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "list_backfill_runs" },
      "Failed to fetch WordPress backfill runs",
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
