import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserStats } from "@/lib/user/stats";
import { logger } from "@/lib/logger";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getUserStats(userId));
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), operation: "get_user_stats", userId },
      "Failed to fetch user stats",
    );
    return NextResponse.json({ error: "Failed to fetch user stats" }, { status: 500 });
  }
}
