import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(await getMusicApi().pages["admin"].$get({ query: input.search })),
  );

export default function AdminDashboard({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const { postsCount, musicCount, eventsCount, recentPosts, recentEvents } = data;
  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2">Published Articles</h2>
          <p className="text-3xl font-black text-[#7CFC00]">{postsCount?.count || 0}</p>
        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2">Music Releases</h2>
          <p className="text-3xl font-black text-[#7CFC00]">{musicCount?.count || 0}</p>
        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2">Published Events</h2>
          <p className="text-3xl font-black text-[#7CFC00]">{eventsCount?.count || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Recent Articles</h2>
          <div className="space-y-2">
            {recentPosts.length === 0 ? (
              <p className="text-gray-400">No articles yet</p>
            ) : (
              recentPosts.map((post) => (
                <div key={post.id} className="border-b border-gray-800 pb-2">
                  <Link
                    {...(post.status === "published"
                      ? { to: "/article/$slug" as const, params: { slug: post.slug } }
                      : { to: "/admin/posts/$id" as const, params: { id: String(post.id) } })}
                    className="group inline-block"
                  >
                    <h3 className="font-bold group-hover:text-[#7CFC00] transition-colors">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-400">
                    {post.status} •{" "}
                    {new Date(post.createdAt).toLocaleDateString("en-US", {
                      timeZone: "America/Chicago",
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Recent Events</h2>
          <div className="space-y-2">
            {recentEvents.length === 0 ? (
              <p className="text-gray-400">No events yet</p>
            ) : (
              recentEvents.map((event) => (
                <div key={event.id} className="border-b border-gray-800 pb-2">
                  <Link
                    {...(event.status === "published"
                      ? { to: "/events/$slug" as const, params: { slug: event.slug } }
                      : { to: "/admin/events/$id" as const, params: { id: String(event.id) } })}
                    className="group inline-block"
                  >
                    <h3 className="font-bold group-hover:text-[#7CFC00] transition-colors">
                      {event.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-400">
                    {event.status} •{" "}
                    {new Date(event.createdAt).toLocaleDateString("en-US", {
                      timeZone: "America/Chicago",
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
