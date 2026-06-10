import { redirect } from "next/navigation";
import { checkRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { posts, events } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import Link from "next/link";

export default async function AdminDashboard() {
  const isSuperAdmin = await checkRole("super_admin");
  const isWriter = await checkRole("writer");

  if (!isSuperAdmin && !isWriter) {
    redirect("/");
  }

  // Get stats
  const [postsCount] = await db
    .select({ count: count() })
    .from(posts)
    .where(eq(posts.status, "published"));

  const [eventsCount] = await db
    .select({ count: count() })
    .from(events)
    .where(eq(events.status, "published"));

  // Get recent posts
  const recentPosts = await db.select().from(posts).orderBy(desc(posts.createdAt)).limit(5);

  // Get recent events
  const recentEvents = await db.select().from(events).orderBy(desc(events.createdAt)).limit(5);

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2">Published Posts</h2>
          <p className="text-3xl font-black text-[#7CFC00]">{postsCount?.count || 0}</p>
        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2">Published Events</h2>
          <p className="text-3xl font-black text-[#7CFC00]">{eventsCount?.count || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Recent Posts</h2>
          <div className="space-y-2">
            {recentPosts.length === 0 ? (
              <p className="text-gray-400">No posts yet</p>
            ) : (
              recentPosts.map((post) => (
                <div key={post.id} className="border-b border-gray-800 pb-2">
                  <Link
                    href={post.status === "published" ? `/article/${post.slug}` : `/admin/posts/${post.id}`}
                    className="group inline-block"
                  >
                    <h3 className="font-bold group-hover:text-[#7CFC00] transition-colors">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-400">
                    {post.status} • {new Date(post.createdAt).toLocaleDateString()}
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
                    href={event.status === "published" ? `/events/${event.slug}` : `/admin/events/${event.id}`}
                    className="group inline-block"
                  >
                    <h3 className="font-bold group-hover:text-[#7CFC00] transition-colors">
                      {event.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-400">
                    {event.status} • {new Date(event.createdAt).toLocaleDateString()}
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

