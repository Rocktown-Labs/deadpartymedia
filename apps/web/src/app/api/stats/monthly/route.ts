import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMonthlyHomepageStats } from "@/lib/api/stats.server";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function GET(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    const monthlyStats = await getMonthlyHomepageStats();

    return NextResponse.json(monthlyStats, {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "fetch_monthly_stats" },
      "Error fetching monthly stats",
    );
    return NextResponse.json({ error: "Failed to fetch monthly stats" }, { status: 500 });
  }
}
