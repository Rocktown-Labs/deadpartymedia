import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(await getMusicApi().pages["admin"]["posts"].$get({ query: input.search })),
  );

import { Button } from "@/components/ui/button";
import { PostsTable } from "./posts-table";

export default function PostsPage({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const {
    userId,
    isSuperAdmin,
    params,
    page,
    order,
    totalCount,
    currentSearchParamsString,
    postRows,
  } = data;
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-black">Articles</h1>
        <div className="flex gap-4">
          {isSuperAdmin && (
            <Link to="/admin/posts/wordpress">
              <Button variant="outline">WordPress Backfill</Button>
            </Link>
          )}
          <Link to="/admin/posts/new">
            <Button>Create New Article</Button>
          </Link>
        </div>
      </div>

      <PostsTable
        currentOrder={order}
        currentSearchParams={currentSearchParamsString}
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
