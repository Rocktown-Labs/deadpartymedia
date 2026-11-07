import { Link, createFileRoute } from "@tanstack/react-router";
import { apiFetchWithAuth } from "../lib/api";

interface UserStats {
  commentsCount: number;
  readCount: number;
  savedCount: number;
}

/**
 * Ported from apps/web/src/app/dashboard/page.tsx: the fan overview reads
 * GET /music/user/stats with the session forwarded to the API worker.
 */
export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
  head: () => ({ meta: [{ title: "Dashboard | Dead Party Media" }] }),
  loader: async () => {
    try {
      return await apiFetchWithAuth<UserStats>("/music/user/stats");
    } catch {
      return { commentsCount: 0, readCount: 0, savedCount: 0 } satisfies UserStats;
    }
  },
});

function DashboardIndex() {
  const { userId } = Route.useRouteContext({ select: (c) => c.session });
  const stats = Route.useLoaderData();

  return (
    <>
      <h1 className="mb-1 text-4xl font-black">Dashboard</h1>
      <p className="mb-8 text-sm text-gray-400">
        Signed in as <span className="font-mono text-[#7CFC00]">{userId}</span>
      </p>

      <div className="mb-8 grid grid-cols-3 gap-4">
        {[
          { label: "Articles read", value: stats.readCount },
          { label: "Saved", value: stats.savedCount },
          { label: "Comments", value: stats.commentsCount },
        ].map((item) => (
          <div className="rounded-md border border-white/10 p-4" key={item.label}>
            <p className="text-2xl font-black text-[#7CFC00]">{item.value}</p>
            <p className="text-sm text-gray-400">{item.label}</p>
          </div>
        ))}
      </div>

      <nav className="flex flex-wrap gap-3 text-sm">
        {[
          { label: "Reading history", to: "/dashboard/history" },
          { label: "Saved articles", to: "/dashboard/saved" },
          { label: "My comments", to: "/dashboard/comments" },
          { label: "Settings", to: "/dashboard/settings" },
        ].map((item) => (
          <Link
            className="rounded-md border border-white/10 px-3 py-1.5 text-gray-300 hover:border-[#7CFC00]/40 hover:text-[#7CFC00]"
            key={item.to}
            to={item.to}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
