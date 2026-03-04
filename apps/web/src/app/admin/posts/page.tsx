import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@clerk/nextjs/server";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminSortHeader } from "@/components/admin/admin-sort-header";
import { DeleteConfirm } from "@/components/admin/delete-confirm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ADMIN_PAGE_SIZE,
  buildSearchParams,
  getOffsetFromPage,
  parsePageParam,
  parseSortOrderParam,
  parseSortParam,
} from "@/lib/admin/table-state";
import { checkRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { approveDeletePost, deletePost, denyDeletePost, requestDeletePost } from "./actions";

const POST_SORT_FIELDS = ["title", "status", "category", "isCoverStory", "createdAt"] as const;

type PostSortField = (typeof POST_SORT_FIELDS)[number];

interface PostsSearchParams {
  order?: string;
  page?: string;
  sort?: string;
}

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<PostsSearchParams>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  const isSuperAdmin = await checkRole("super_admin");
  const isWriter = await checkRole("writer");

  if (!isSuperAdmin && !isWriter) {
    redirect("/");
  }

  const params = await searchParams;
  const page = parsePageParam(params.page);
  const sort = parseSortParam<PostSortField>(params.sort, POST_SORT_FIELDS, "createdAt");
  const order = parseSortOrderParam(params.order, "desc");
  const offset = getOffsetFromPage(page, ADMIN_PAGE_SIZE);

  const whereClause = isSuperAdmin ? undefined : eq(posts.authorId, userId);

  const totalQuery = db.select({ total: count() }).from(posts);
  const rowsQuery = db.select().from(posts);

  const [totalRows, pagedPosts] = await Promise.all([
    whereClause ? totalQuery.where(whereClause) : totalQuery,
    (whereClause ? rowsQuery.where(whereClause) : rowsQuery)
      .orderBy(
        sort === "title"
          ? (order === "asc"
            ? asc(posts.title)
            : desc(posts.title))
          : sort === "status"
            ? order === "asc"
              ? asc(posts.status)
              : desc(posts.status)
            : sort === "category"
              ? order === "asc"
                ? asc(posts.category)
                : desc(posts.category)
              : sort === "isCoverStory"
                ? order === "asc"
                  ? asc(posts.isCoverStory)
                  : desc(posts.isCoverStory)
                : order === "asc"
                  ? asc(posts.createdAt)
                  : desc(posts.createdAt),
        desc(posts.createdAt),
      )
      .limit(ADMIN_PAGE_SIZE)
      .offset(offset),
  ]);

  const totalCount = Number(totalRows[0]?.total ?? 0);
  const currentSearchParams = buildSearchParams(params);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-black">Posts</h1>
        <Link href="/admin/posts/new">
          <Button>Create New Post</Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#0A0A0A]">
              <TableRow className="border-gray-800 hover:bg-transparent">
                <TableHead>
                  <AdminSortHeader
                    currentOrder={order}
                    currentSort={params.sort}
                    defaultSort="createdAt"
                    field="title"
                    label="Title"
                    pathname="/admin/posts"
                    searchParams={currentSearchParams}
                  />
                </TableHead>
                <TableHead>
                  <AdminSortHeader
                    currentOrder={order}
                    currentSort={params.sort}
                    defaultSort="createdAt"
                    field="status"
                    label="Status"
                    pathname="/admin/posts"
                    searchParams={currentSearchParams}
                  />
                </TableHead>
                <TableHead>
                  <AdminSortHeader
                    currentOrder={order}
                    currentSort={params.sort}
                    defaultSort="createdAt"
                    field="category"
                    label="Category"
                    pathname="/admin/posts"
                    searchParams={currentSearchParams}
                  />
                </TableHead>
                <TableHead>
                  <AdminSortHeader
                    currentOrder={order}
                    currentSort={params.sort}
                    defaultSort="createdAt"
                    field="isCoverStory"
                    label="Cover Story"
                    pathname="/admin/posts"
                    searchParams={currentSearchParams}
                  />
                </TableHead>
                <TableHead>
                  <AdminSortHeader
                    currentOrder={order}
                    currentSort={params.sort}
                    defaultSort="createdAt"
                    field="createdAt"
                    label="Created"
                    pathname="/admin/posts"
                    searchParams={currentSearchParams}
                  />
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedPosts.length === 0 ? (
                <TableRow className="border-gray-800">
                  <TableCell colSpan={6} className="px-6 py-4 text-center text-gray-400">
                    No posts found
                  </TableCell>
                </TableRow>
              ) : (
                pagedPosts.map((post) => (
                  <TableRow key={post.id} className="border-gray-800 hover:bg-gray-900">
                    <TableCell className="px-6 py-4">
                      <Link
                        href={`/admin/posts/${post.id}`}
                        className="font-bold transition-colors hover:text-[#7CFC00]"
                      >
                        {post.title}
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`rounded px-2 py-1 text-xs font-bold ${
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
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-400">
                      {post.category}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {post.isCoverStory ? (
                        <span className="font-bold text-[#7CFC00]">★</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-400">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <AdminPagination
          pathname="/admin/posts"
          searchParams={currentSearchParams}
          page={page}
          totalItems={totalCount}
        />
      </div>
    </div>
  );
}
