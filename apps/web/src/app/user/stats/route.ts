import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserStats } from "@/lib/user/stats";

/**
 * Legacy-compatible user stats endpoint (no `/api` prefix).
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getUserStats(userId));
  } catch {
    return NextResponse.json({ error: "Failed to fetch user stats" }, { status: 500 });
  }
}
