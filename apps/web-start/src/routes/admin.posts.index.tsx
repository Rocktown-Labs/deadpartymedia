import { createFileRoute } from "@tanstack/react-router";
import { AdminTable } from "../components/admin/admin-table";
import { apiFetchWithAuth } from "../lib/api";

interface PostRow {
  authorName: string | null;
  category: string;
  id: number;
  status: string;
  title: string;
  views: number;
}

/**
 * Admin posts list — ported from the Next admin
 * posts table (data+route; the tanstack-table client
 * with bulk actions is the visual parity pass). Writers are scoped to their
 * own rows by the API.
 */
export const Route = createFileRoute("/admin/posts/")({
  component: () => {
    const { error, rows, total } = Route.useLoaderData();
    return (
      <AdminTable
        columns={[
          {
            key: "title",
            label: "Title",
            render: (row: PostRow) => <span className="font-semibold">{row.title}</span>,
          },
          {
            key: "status",
            label: "Status",
            render: (row: PostRow) => (
              <span className={row.status === "published" ? "text-[#7CFC00]" : "text-yellow-400"}>
                {row.status}
              </span>
            ),
          },
          { key: "category", label: "Category" },
          { key: "authorName", label: "Author" },
          { key: "views", label: "Views" },
        ]}
        error={error}
        rows={rows}
        subtitle="Served by the platform API (staff-scoped)"
        title="Posts"
        total={total}
      />
    );
  },
  head: () => ({ meta: [{ title: "Admin: Posts | Dead Party Media" }] }),
  loader: async () => {
    const data = await apiFetchWithAuth<{ posts: PostRow[]; total: number }>(
      "/music/admin/posts?limit=50",
    ).catch(() => null);
    if (!data) {
      return { error: "Failed to load posts", rows: [], total: 0 };
    }
    return { error: null, rows: data.posts, total: data.total };
  },
});
