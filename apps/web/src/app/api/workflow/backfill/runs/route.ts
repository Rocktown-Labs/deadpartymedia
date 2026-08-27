import { checkRole } from "@/lib/auth/roles";
import { connection } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { backfillRuns } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  await connection();

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
    console.error("Failed to fetch WordPress backfill runs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
