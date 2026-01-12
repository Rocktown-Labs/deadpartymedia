import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { canEdit } from "@/lib/auth/access";
import { PostEditor } from "@/components/admin/post-editor";
import { updatePost } from "../actions";

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

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Edit Post</h1>
      <PostEditor
        initialData={{
          title: post.title,
          slug: post.slug,
          category: post.category,
          excerpt: post.excerpt,
          content: post.content,
          coverImage: post.coverImage || undefined,
          status: post.status,
          isCoverStory: post.isCoverStory,
        }}
        onSubmit={(formData) => updatePost(postId, formData)}
        onCancel={() => redirect("/admin/posts")}
      />
    </div>
  );
}
