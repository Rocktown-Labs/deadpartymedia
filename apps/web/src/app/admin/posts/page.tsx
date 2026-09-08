import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@clerk/nextjs/server";
import { asc, count, desc, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
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
import { PostsTable } from "./posts-table";

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
          ? order === "asc"
            ? asc(posts.title)
            : desc(posts.title)
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
  const currentSearchParams = buildSearchParams(
    params as Record<string, string | string[] | undefined>,
  );
  const postRows = pagedPosts.map((post) => ({
    authorId: post.authorId,
    category: post.category,
    createdAt: post.createdAt.toISOString(),
    deleteRequested: post.deleteRequested,
    id: post.id,
    isCoverStory: post.isCoverStory,
    status: post.status,
    title: post.title,
  }));

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-black">Articles</h1>
        <div className="flex gap-4">
          {isSuperAdmin && (
            <Link href="/admin/posts/wordpress">
              <Button variant="outline">WordPress Backfill</Button>
            </Link>
          )}
          <Link href="/admin/posts/new">
            <Button>Create New Article</Button>
          </Link>
        </div>
      </div>

      <PostsTable
        currentOrder={order}
        currentSearchParams={currentSearchParams.toString()}
        currentSort={params.sort}
        isSuperAdmin={isSuperAdmin}
        page={page}
        posts={postRows}
        totalCount={totalCount}
        userId={userId}
      />
    </div>
  );
}
