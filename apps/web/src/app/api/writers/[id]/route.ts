import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, users } from "@/lib/db/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsedId = Number.parseInt(id, 10);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return NextResponse.json({ error: "Invalid writer id" }, { status: 400 });
  }

  const [writer] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      imageUrl: users.imageUrl,
      role: users.role,
      articleCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM ${posts}
        WHERE ${posts.authorId} = ${users.clerkId}
        AND ${posts.status} = 'published'
      )`.as("articleCount"),
    })
    .from(users)
    .where(
      and(eq(users.id, parsedId), inArray(users.role, ["writer", "super_admin"])),
    )
    .limit(1);

  if (!writer) {
    return NextResponse.json({ error: "Writer not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: writer.id,
    name: [writer.firstName, writer.lastName].filter(Boolean).join(" ").trim() || "Writer",
    bio: "",
    image: writer.imageUrl ?? null,
    role: writer.role,
    twitter: null,
    instagram: null,
    articleCount: writer.articleCount ?? 0,
  });
}
