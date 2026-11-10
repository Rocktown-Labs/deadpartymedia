import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["admin"]["music"]["submissions"].$get({ query: input.search }),
    ),
  );

import { ArrowLeft } from "lucide-react";
import { SubmissionsClient } from "./submissions-client";

export default function AdminMusicSubmissionsPage({
  data,
}: {
  data: Awaited<ReturnType<typeof loadPage>>;
}) {
  const { submissions, pendingCount } = data;
  return (
    <div>
      <div className="mb-6">
        <Link
          to={"/admin/music"}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Music Releases
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">Artist Music Submissions</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Review, approve, or decline music releases submitted by Arkansas artists.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-3">
        <Link
          to={"/admin/music"}
          className="px-3 py-1.5 rounded-md text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
        >
          All Releases
        </Link>
        <Link
          to={"/admin/music/submissions"}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-zinc-800 text-white flex items-center gap-2"
        >
          <span>Artist Submissions</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#7CFC00] text-black">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>

      <SubmissionsClient initialSubmissions={submissions} />
    </div>
  );
}
