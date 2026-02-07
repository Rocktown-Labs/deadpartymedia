import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userArticleSaves } from "@/lib/db/schema";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsedId = Number.parseInt(id, 10);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(userArticleSaves)
    .where(
      and(eq(userArticleSaves.id, parsedId), eq(userArticleSaves.clerkUserId, userId)),
    )
    .returning({ id: userArticleSaves.id });

  if (!deleted) {
    return NextResponse.json({ error: "Saved article not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
