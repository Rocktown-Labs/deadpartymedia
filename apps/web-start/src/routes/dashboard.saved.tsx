import { Link, createFileRoute } from "@tanstack/react-router";
import { apiFetchWithAuth } from "../lib/api";

interface SavedArticle {
  articleSlug: string;
  articleTitle: string;
  savedAt: string;
}

/**
 * Ported from apps/web/src/app/dashboard/saved (reads GET /music/user/articles/saved).
 */
export const Route = createFileRoute("/dashboard/saved")({
  component: SavedPage,
  head: () => ({ meta: [{ title: "Saved Articles | Dead Party Media" }] }),
  loader: async () => {
    try {
      return await apiFetchWithAuth<SavedArticle[]>("/music/user/articles/saved");
    } catch {
      return [] satisfies SavedArticle[];
    }
  },
});

function SavedPage() {
  const saved = Route.useLoaderData();

  return (
    <>
      <h1 className="mb-6 text-3xl font-black">Saved articles</h1>
      {saved.length === 0 ? (
        <p className="text-gray-400">Nothing saved yet — bookmark articles as you read.</p>
      ) : (
        <ul className="space-y-3">
          {saved.map((item) => (
            <li className="rounded-md border border-white/10 px-4 py-3" key={item.articleSlug}>
              <Link
                className="font-semibold hover:text-[#7CFC00]"
                params={{ slug: item.articleSlug }}
                to="/article/$slug"
              >
                {item.articleTitle}
              </Link>
              <p className="text-xs text-gray-500">
                Saved {new Date(item.savedAt).toLocaleDateString("en-US")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
