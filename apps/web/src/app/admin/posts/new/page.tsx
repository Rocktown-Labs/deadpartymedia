import { redirect } from "next/navigation";
import { canCreate } from "@/lib/auth/access";
import { PostEditor } from "@/components/admin/post-editor";
import { createPost } from "../actions";

export default async function NewPostPage() {
  if (!(await canCreate())) {
    redirect("/admin");
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Create New Post</h1>
      <PostEditor onSubmit={createPost} onCancel={() => redirect("/admin/posts")} />
    </div>
  );
}
