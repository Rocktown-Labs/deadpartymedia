import { AdminPagination } from "@/components/admin/admin-pagination";
import { buildSearchParams } from "@/lib/admin/table-state";
import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import WordpressBackfillClient from "./wordpress-backfill-client";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["admin"]["posts"]["wordpress"].$get({ query: input.search }),
    ),
  );

export const dynamic = "force-dynamic";

export default function WordPressBackfillPage({
  data,
}: {
  data: Awaited<ReturnType<typeof loadPage>>;
}) {
  const { wpPage, limit, wordpressPosts, totalPosts, authorOptions } = data;
  return (
    <div className="py-6 space-y-6">
      <WordpressBackfillClient posts={wordpressPosts} authorOptions={authorOptions} />
      {totalPosts > limit && (
        <div className="mt-6 flex justify-center">
          <AdminPagination
            pathname="/admin/posts/wordpress"
            page={wpPage}
            pageParam="wp_page"
            searchParams={buildSearchParams({ wp_page: String(wpPage) })}
            totalItems={totalPosts}
            pageSize={limit}
          />
        </div>
      )}
    </div>
  );
}
