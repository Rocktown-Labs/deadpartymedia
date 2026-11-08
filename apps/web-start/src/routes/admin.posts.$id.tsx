import { createFileRoute, notFound } from "@tanstack/react-router";
import { PostEditor, type PostFormValue } from "../components/admin/post-editor";
import { apiFetchWithAuth } from "../lib/api";

interface PostRow {
  category: string;
  content: string;
  coverImage: string | null;
  excerpt: string;
  id: number;
  isCoverStory: boolean;
  slug: string;
  status: string;
  title: string;
}

/** Edit post screen — loads the full row from the API then renders the editor. */
export const Route = createFileRoute("/admin/posts/$id")({
  component: () => {
    const { post } = Route.useLoaderData();
    return <PostEditor initial={post} />;
  },
  head: () => ({ meta: [{ title: "Edit Post | Dead Party Media" }] }),
  loader: async ({ params }) => {
    const data = await apiFetchWithAuth<{ post: PostRow }>(`/music/admin/posts/${params.id}`).catch(
      () => null,
    );
    if (!data?.post) {
      throw notFound();
    }
    const post: PostFormValue = {
      category: data.post.category,
      content: data.post.content,
      coverImage: data.post.coverImage,
      excerpt: data.post.excerpt,
      id: data.post.id,
      isCoverStory: data.post.isCoverStory,
      slug: data.post.slug,
      status: data.post.status,
      title: data.post.title,
    };
    return { post };
  },
});
