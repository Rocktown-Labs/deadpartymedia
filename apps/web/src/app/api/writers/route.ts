import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, users } from "@/lib/db/schema";

export async function GET() {
  const writers = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      imageUrl: users.imageUrl,
      role: users.role,
      articleCount: sql<number>`count(${posts.id})::int`.as("articleCount"),
    })
    .from(users)
    .leftJoin(
      posts,
      and(eq(posts.authorId, users.clerkId), eq(posts.status, "published")),
    )
    .groupBy(users.id, users.firstName, users.lastName, users.imageUrl, users.role)
    .where(inArray(users.role, ["writer", "super_admin"]));

  return NextResponse.json(
    writers.map((writer) => ({
      id: writer.id,
      name: [writer.firstName, writer.lastName].filter(Boolean).join(" ").trim() || "Writer",
      bio: "",
      image: writer.imageUrl ?? null,
      role: writer.role,
      twitter: null,
      instagram: null,
      articleCount: writer.articleCount ?? 0,
    })),
  );
}
