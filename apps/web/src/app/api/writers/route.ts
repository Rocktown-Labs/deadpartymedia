import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, users } from "@/lib/db/schema";

export async function GET() {
  const writers = await db
    .select({
      articleCount: sql<number>`count(${posts.id})::int`.as("articleCount"),
      firstName: users.firstName,
      id: users.id,
      imageUrl: users.imageUrl,
      lastName: users.lastName,
      role: users.role,
    })
    .from(users)
    .leftJoin(posts, and(eq(posts.authorId, users.clerkId), eq(posts.status, "published")))
    .groupBy(users.id, users.firstName, users.lastName, users.imageUrl, users.role)
    .where(inArray(users.role, ["writer", "super_admin"]));

  return NextResponse.json(
    writers.map((writer) => ({
      articleCount: writer.articleCount ?? 0,
      bio: "",
      id: writer.id,
      image: writer.imageUrl ?? null,
      instagram: null,
      name: [writer.firstName, writer.lastName].filter(Boolean).join(" ").trim() || "Writer",
      role: writer.role,
      twitter: null,
    })),
  );
}
