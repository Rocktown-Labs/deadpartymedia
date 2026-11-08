import { createFileRoute } from "@tanstack/react-router";
import { PostsTable, type PostsTableRow } from "../components/admin/posts-table";
import { apiFetchWithAuth } from "../lib/api";

/**
 * Admin posts list — the tanstack-table client with selection + bulk
 * publish toggling, replacing the server-rendered table. Loaders stay
 * server-side (auth-forwarded); the table handles selection client-side.
 */
export const Route = createFileRoute("/admin/posts/")({
  component: () => {
    const { error, rows } = Route.useLoaderData();
    if (error) {
      return <p className="rounded-md border border-red-500/40 px-4 py-3 text-red-400">{error}</p>;
    }
    return <PostsTable initialRows={rows} />;
  },
  head: () => ({ meta: [{ title: "Admin: Posts | Dead Party Media" }] }),
  loader: async () => {
    const data = await apiFetchWithAuth<{ posts: PostsTableRow[]; total: number }>(
      "/music/admin/posts?limit=100",
    ).catch(() => null);
    if (!data) {
      return { error: "Failed to load posts", rows: [] as PostsTableRow[] };
    }
    return { error: null, rows: data.posts };
  },
});
