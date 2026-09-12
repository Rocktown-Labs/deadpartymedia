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
import { musicReleases } from "@/lib/db/schema";
import { MusicReleasesTable } from "./music-releases-table";

const MUSIC_SORT_FIELDS = [
  "title",
  "artistName",
  "releaseType",
  "genre",
  "status",
  "releaseDate",
  "createdAt",
] as const;

type MusicSortField = (typeof MUSIC_SORT_FIELDS)[number];

interface MusicSearchParams {
  order?: string;
  page?: string;
  sort?: string;
}

export default async function AdminMusicPage({
  searchParams,
}: {
  searchParams: Promise<MusicSearchParams>;
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
  const sort = parseSortParam<MusicSortField>(params.sort, MUSIC_SORT_FIELDS, "createdAt");
  const order = parseSortOrderParam(params.order, "desc");
  const offset = getOffsetFromPage(page, ADMIN_PAGE_SIZE);

  const whereClause = isSuperAdmin ? undefined : eq(musicReleases.authorId, userId);

  const totalQuery = db.select({ total: count() }).from(musicReleases);
  const rowsQuery = db.select().from(musicReleases);

  const pendingQuery = db
    .select({ count: count() })
    .from(musicReleases)
    .where(eq(musicReleases.submissionStatus, "pending"));

  const [totalRows, pagedReleases, pendingRows] = await Promise.all([
    whereClause ? totalQuery.where(whereClause) : totalQuery,
    (whereClause ? rowsQuery.where(whereClause) : rowsQuery)
      .orderBy(
        sort === "title"
          ? order === "asc"
            ? asc(musicReleases.title)
            : desc(musicReleases.title)
          : sort === "artistName"
            ? order === "asc"
              ? asc(musicReleases.artistName)
              : desc(musicReleases.artistName)
            : sort === "releaseType"
              ? order === "asc"
                ? asc(musicReleases.releaseType)
                : desc(musicReleases.releaseType)
              : sort === "genre"
                ? order === "asc"
                  ? asc(musicReleases.genre)
                  : desc(musicReleases.genre)
                : sort === "status"
                  ? order === "asc"
                    ? asc(musicReleases.status)
                    : desc(musicReleases.status)
                  : sort === "releaseDate"
                    ? order === "asc"
                      ? asc(musicReleases.releaseDate)
                      : desc(musicReleases.releaseDate)
                    : order === "asc"
                      ? asc(musicReleases.createdAt)
                      : desc(musicReleases.createdAt),
        desc(musicReleases.createdAt),
      )
      .limit(ADMIN_PAGE_SIZE)
      .offset(offset),
    pendingQuery,
  ]);

  const totalCount = Number(totalRows[0]?.total ?? 0);
  const pendingCount = Number(pendingRows[0]?.count ?? 0);
  const currentSearchParams = buildSearchParams(
    params as Record<string, string | string[] | undefined>,
  );

  const releaseRows = pagedReleases.map((release) => ({
    artistName: release.artistName,
    authorId: release.authorId,
    coverArt: release.coverArt,
    createdAt: release.createdAt.toISOString(),
    featured: release.featured,
    genre: release.genre,
    id: release.id,
    releaseDate: release.releaseDate,
    releaseType: release.releaseType,
    slug: release.slug,
    status: release.status,
    title: release.title,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Music Releases</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage Arkansas album and single releases, streaming links, and discography.
          </p>
        </div>
        <Link href={"/admin/music/new" as Route}>
          <Button className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90 font-bold">
            Create New Release
          </Button>
        </Link>
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-3">
        <Link
          href={"/admin/music" as Route}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-zinc-800 text-white"
        >
          All Releases ({totalCount})
        </Link>
        <Link
          href={"/admin/music/submissions" as Route}
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
        currentSearchParams={currentSearchParams.toString()}
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
