import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { parseRole } from "@/lib/auth/role";
import { getPrimaryEmail } from "@/lib/auth/clerk";

export async function GET() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  const role = parseRole(sessionClaims?.metadata?.role) ?? dbUser?.role ?? "fan";
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const email = getPrimaryEmail(clerkUser);

  return NextResponse.json({
    id: userId,
    email: email ?? "",
    name: clerkUser.fullName || clerkUser.firstName || email || "User",
    role,
    avatar: clerkUser.imageUrl ?? null,
  });
}
