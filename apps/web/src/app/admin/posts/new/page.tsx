import { redirect } from "next/navigation";
import { canCreate } from "@/lib/auth/access";
import { PostEditor } from "@/components/admin/post-editor";
import { createPost } from "../actions";
import type { Route } from "next";
import { auth } from "@clerk/nextjs/server";
import { checkRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { asc, inArray } from "drizzle-orm";
import { createArtistProfileStub, createUserProfileStub } from "@/app/admin/users/actions";
import { findDefaultBackfillAuthorId } from "@/lib/admin/wordpress-backfill";

export default async function NewPostPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  if (!(await canCreate())) {
    redirect("/admin");
  }

  const isSuperAdmin = await checkRole("super_admin");
  const authorOptions = isSuperAdmin
    ? await db
        .select({
          clerkId: users.clerkId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        })
        .from(users)
        .where(inArray(users.role, ["writer", "super_admin"]))
        .orderBy(asc(users.firstName), asc(users.lastName))
        .then((rows) =>
          rows.map((row) => ({
            clerkId: row.clerkId,
            name: [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || row.email,
            role: row.role,
          })),
        )
    : [];

  const defaultAuthorId = findDefaultBackfillAuthorId(authorOptions, userId);

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Create New Post</h1>
      <PostEditor
        initialData={{ authorId: defaultAuthorId }}
        canManageAuthor={isSuperAdmin}
        authorOptions={authorOptions}
        onCreateAuthorStub={isSuperAdmin ? createUserProfileStub : undefined}
        onCreateArtistStub={isSuperAdmin ? createArtistProfileStub : undefined}
        onSubmit={createPost}
        cancelHref={"/admin/posts" as Route}
        allowCoverImageUrl={false}
      />
    </div>
  );
}
