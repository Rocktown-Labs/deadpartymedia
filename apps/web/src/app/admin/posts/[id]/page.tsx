import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { posts, postArtists, users } from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { canEdit } from "@/lib/auth/access";
import { PostEditor } from "@/components/admin/post-editor";
import { updatePost } from "../actions";
import type { Route } from "next";
import { checkRole } from "@/lib/auth/roles";
import { createArtistProfileStub, createUserProfileStub } from "@/app/admin/users/actions";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = Number.parseInt(id, 10);

  if (Number.isNaN(postId)) {
    redirect("/admin/posts");
  }

  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);

  if (!post) {
    redirect("/admin/posts");
  }

  if (!(await canEdit(post.authorId))) {
    redirect("/admin/posts");
  }

  // Load artist relations for this post
  const postArtistRelations = await db
    .select({ artistId: postArtists.artistId })
    .from(postArtists)
    .where(eq(postArtists.postId, postId));

  const artistIds = postArtistRelations.map((rel) => rel.artistId);
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

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Edit Post</h1>
      <PostEditor
        initialData={{
          artistIds,
          authorId: post.authorId,
          category: post.category,
          content: post.content,
          coverImage: post.coverImage || undefined,
          excerpt: post.excerpt,
          isCoverStory: post.isCoverStory,
          slug: post.slug,
          status: post.status,
          title: post.title,
        }}
        canManageAuthor={isSuperAdmin}
        authorOptions={authorOptions}
        onCreateAuthorStub={isSuperAdmin ? createUserProfileStub : undefined}
        onCreateArtistStub={isSuperAdmin ? createArtistProfileStub : undefined}
        onSubmit={updatePost.bind(null, postId)}
        cancelHref={"/admin/posts" as Route}
      />
    </div>
  );
}
