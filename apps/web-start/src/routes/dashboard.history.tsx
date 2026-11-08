import { Link, createFileRoute } from "@tanstack/react-router";
import { apiFetchWithAuth } from "../lib/api.server";

interface ReadArticle {
  articleSlug: string;
  articleTitle: string;
  readAt: string;
}

/**
 * Ported from apps/web/src/app/dashboard/history (reads GET /music/user/articles/read).
 */
export const Route = createFileRoute("/dashboard/history")({
  component: HistoryPage,
  head: () => ({ meta: [{ title: "Reading History | Dead Party Media" }] }),
  loader: async () => {
    try {
      return await apiFetchWithAuth<ReadArticle[]>("/music/user/articles/read");
    } catch {
      return [] satisfies ReadArticle[];
    }
  },
});

function HistoryPage() {
  const reads = Route.useLoaderData();

  return (
    <>
      <h1 className="mb-6 text-3xl font-black">Reading history</h1>
      {reads.length === 0 ? (
        <p className="text-gray-400">No articles read yet.</p>
      ) : (
        <ul className="space-y-3">
          {reads.map((item) => (
            <li className="rounded-md border border-white/10 px-4 py-3" key={item.articleSlug}>
              <Link
                className="font-semibold hover:text-[#7CFC00]"
                params={{ slug: item.articleSlug }}
                to="/article/$slug"
              >
                {item.articleTitle}
              </Link>
              <p className="text-xs text-gray-500">
                {new Date(item.readAt).toLocaleDateString("en-US")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
