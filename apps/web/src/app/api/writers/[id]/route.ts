import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, users } from "@/lib/db/schema";

// Next's generated RouteHandlerConfig types this as Promise-based params in this project.
interface WriterRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: WriterRouteContext) {
  const { id } = await params;
  const parsedId = Number.parseInt(id, 10);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return NextResponse.json({ error: "Invalid writer id" }, { status: 400 });
  }

  const [writer] = await db
    .select({
      articleCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM ${posts}
        WHERE ${posts.authorId} = ${users.clerkId}
        AND ${posts.status} = 'published'
      )`.as("articleCount"),
      firstName: users.firstName,
      id: users.id,
      imageUrl: users.imageUrl,
      lastName: users.lastName,
      role: users.role,
    })
    .from(users)
    .where(and(eq(users.id, parsedId), inArray(users.role, ["writer", "super_admin"])))
    .limit(1);

  if (!writer) {
    return NextResponse.json({ error: "Writer not found" }, { status: 404 });
  }

  return NextResponse.json({
    articleCount: writer.articleCount ?? 0,
    bio: "",
    id: writer.id,
    image: writer.imageUrl ?? null,
    instagram: null,
    name: [writer.firstName, writer.lastName].filter(Boolean).join(" ").trim() || "Writer",
    role: writer.role,
    twitter: null,
  });
}
