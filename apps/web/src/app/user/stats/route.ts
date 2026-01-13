import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * Legacy-compatible user stats endpoint (no `/api` prefix).
 *
 * The web dashboard still calls `/user/stats` via the deprecated `apiClient`.
 * We return zeroed stats for now so new users can load the dashboard reliably.
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    articles_read_count: 0,
    articles_saved_count: 0,
    comments_count: 0,
  });
}

