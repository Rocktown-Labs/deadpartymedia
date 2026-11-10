import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(await getMusicApi().pages["admin"]["music"].$get({ query: input.search })),
  );

import { Button } from "@/components/ui/button";
import { MusicReleasesTable } from "./music-releases-table";

export default function AdminMusicPage({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const {
    userId,
    isSuperAdmin,
    params,
    page,
    order,
    totalCount,
    pendingCount,
    currentSearchParamsString,
    releaseRows,
  } = data;
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Music Releases</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage Arkansas album and single releases, streaming links, and discography.
          </p>
        </div>
        <Link to={"/admin/music/new"}>
          <Button className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90 font-bold">
            Create New Release
          </Button>
        </Link>
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-3">
        <Link
          to={"/admin/music"}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-zinc-800 text-white"
        >
          All Releases ({totalCount})
        </Link>
        <Link
          to={"/admin/music/submissions"}
          className="px-3 py-1.5 rounded-md text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition flex items-center gap-2"
        >
          <span>Artist Submissions</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#7CFC00] text-black">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>

      <MusicReleasesTable
        currentOrder={order}
        currentSearchParams={currentSearchParamsString}
        currentSort={params.sort}
        isSuperAdmin={isSuperAdmin}
        page={page}
        releases={releaseRows}
        totalCount={totalCount}
        userId={userId}
      />
    </div>
  );
}
