import { redirect } from "next/navigation";
import type { Route } from "next";
import { checkRole } from "@/lib/auth/roles";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirm } from "@/components/admin/delete-confirm";
import { deletePost, requestDeletePost, approveDeletePost, denyDeletePost } from "./actions";

export default async function PostsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  const isSuperAdmin = await checkRole("super_admin");
  const isWriter = await checkRole("writer");

  if (!isSuperAdmin && !isWriter) {
    redirect("/");
  }

  // Filter posts based on role
  const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt));

  const filteredPosts = isSuperAdmin
    ? allPosts
    : allPosts.filter((post) => post.authorId === userId);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black">Posts</h1>
        <Link href="/admin/posts/new">
          <Button>Create New Post</Button>
        </Link>
      </div>

      <div className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0A0A0A] border-b border-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Cover Story
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredPosts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                  No posts found
                </td>
              </tr>
            ) : (
              filteredPosts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-900">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/posts/${post.id}`}
                      className="font-bold hover:text-[#7CFC00] transition-colors"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          post.status === "published"
                            ? "bg-green-500/20 text-green-400"
                            : (post.status === "draft"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-gray-500/20 text-gray-400")
                        }`}
                      >
                        {post.status}
                      </span>
                      {post.deleteRequested && (
                        <Badge variant="destructive" className="text-xs">
                          Delete Requested
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{post.category}</td>
                  <td className="px-6 py-4">
                    {post.isCoverStory ? (
                      <span className="text-[#7CFC00] font-bold">★</span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Link href={`/admin/posts/${post.id}`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      {post.deleteRequested && isSuperAdmin ? (
                        <>
                          <form action={approveDeletePost.bind(null, post.id)} className="inline">
                            <Button type="submit" variant="destructive" size="sm">
                              Approve Delete
                            </Button>
                          </form>
                          <form action={denyDeletePost.bind(null, post.id)} className="inline">
                            <Button type="submit" variant="outline" size="sm">
                              Deny
                            </Button>
                          </form>
                        </>
                      ) : isSuperAdmin ? (
                        <DeleteConfirm
                          action={deletePost.bind(null, post.id)}
                          title="Delete Post"
                          description={`Are you sure you want to delete "${post.title}"? This action cannot be undone.`}
                        />
                      ) : post.authorId === userId && !post.deleteRequested ? (
                        <form action={requestDeletePost.bind(null, post.id)} className="inline">
                          <Button type="submit" variant="outline" size="sm">
                            Request Delete
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
