import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@clerk/nextjs/server";
import { asc, count, desc } from "drizzle-orm";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminSortHeader } from "@/components/admin/admin-sort-header";
import { DeleteConfirm } from "@/components/admin/delete-confirm";
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
import { artists } from "@/lib/db/schema";
import { deleteArtist, mergeArtistRecords } from "./actions";
import { InviteArtistForm } from "./invite-artist-form";

const ARTIST_SORT_FIELDS = ["name", "genre", "location", "claimed", "email", "createdAt"] as const;

type ArtistSortField = (typeof ARTIST_SORT_FIELDS)[number];

function normalizeDuplicateKey(name: string) {
  return name.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

interface ArtistsSearchParams {
  order?: string;
  page?: string;
  sort?: string;
}

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<ArtistsSearchParams>;
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
  const sort = parseSortParam<ArtistSortField>(params.sort, ARTIST_SORT_FIELDS, "createdAt");
  const order = parseSortOrderParam(params.order, "desc");
  const offset = getOffsetFromPage(page, ADMIN_PAGE_SIZE);

  const [totalRows, allArtists] = await Promise.all([
    db.select({ total: count() }).from(artists),
    db
      .select()
      .from(artists)
      .orderBy(
        sort === "name"
          ? order === "asc"
            ? asc(artists.name)
            : desc(artists.name)
          : sort === "genre"
            ? order === "asc"
              ? asc(artists.genre)
              : desc(artists.genre)
            : sort === "location"
              ? order === "asc"
                ? asc(artists.location)
                : desc(artists.location)
              : sort === "claimed"
                ? order === "asc"
                  ? asc(artists.claimed)
                  : desc(artists.claimed)
                : sort === "email"
                  ? order === "asc"
                    ? asc(artists.email)
                    : desc(artists.email)
                  : order === "asc"
                    ? asc(artists.createdAt)
                    : desc(artists.createdAt),
        desc(artists.createdAt),
      )
      .limit(ADMIN_PAGE_SIZE)
      .offset(offset),
  ]);
  const duplicateCandidates = await db
    .select({
      claimed: artists.claimed,
      createdAt: artists.createdAt,
      id: artists.id,
      name: artists.name,
    })
    .from(artists)
    .orderBy(asc(artists.name), asc(artists.createdAt));

  const totalCount = Number(totalRows[0]?.total ?? 0);
  const currentSearchParams = buildSearchParams(
    params as Record<string, string | string[] | undefined>,
  );
  const duplicateGroups = duplicateCandidates.reduce<Record<string, typeof duplicateCandidates>>(
    (groups, artist) => {
      const key = normalizeDuplicateKey(artist.name);
      groups[key] = [...(groups[key] ?? []), artist];
      return groups;
    },
    {},
  );
  const duplicateOptionsByArtistId = new Map(
    duplicateCandidates.map((artist) => {
      const group = duplicateGroups[normalizeDuplicateKey(artist.name)] ?? [];
      return [artist.id, group.filter((candidate) => candidate.id !== artist.id)];
    }),
  );

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-black">Artists</h1>
        <Link href="/admin/artists/new">
          <Button>Create New Artist</Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#0A0A0A]">
              <TableRow className="border-gray-800 hover:bg-transparent">
                <TableHead>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    Image
                  </span>
                </TableHead>
                <TableHead>
                  <AdminSortHeader
                    currentOrder={order}
                    currentSort={params.sort}
                    defaultSort="createdAt"
                    field="name"
                    label="Name"
                    pathname="/admin/artists"
                    searchParams={currentSearchParams}
                  />
                </TableHead>
                <TableHead>
                  <AdminSortHeader
                    currentOrder={order}
                    currentSort={params.sort}
                    defaultSort="createdAt"
                    field="genre"
                    label="Genre"
                    pathname="/admin/artists"
                    searchParams={currentSearchParams}
                  />
                </TableHead>
                <TableHead>
                  <AdminSortHeader
                    currentOrder={order}
                    currentSort={params.sort}
                    defaultSort="createdAt"
                    field="location"
                    label="Location"
                    pathname="/admin/artists"
                    searchParams={currentSearchParams}
                  />
                </TableHead>
                <TableHead>
                  <AdminSortHeader
                    currentOrder={order}
                    currentSort={params.sort}
                    defaultSort="createdAt"
                    field="claimed"
                    label="Claimed"
                    pathname="/admin/artists"
                    searchParams={currentSearchParams}
                  />
                </TableHead>
                <TableHead>
                  <AdminSortHeader
                    currentOrder={order}
                    currentSort={params.sort}
                    defaultSort="createdAt"
                    field="email"
                    label="Email"
                    pathname="/admin/artists"
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
                    pathname="/admin/artists"
                    searchParams={currentSearchParams}
                  />
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allArtists.length === 0 ? (
                <TableRow className="border-gray-800">
                  <TableCell colSpan={8} className="px-6 py-4 text-center text-gray-400">
                    No artists found
                  </TableCell>
                </TableRow>
              ) : (
                allArtists.map((artist) => (
                  <TableRow key={artist.id} className="border-gray-800 hover:bg-gray-900">
                    <TableCell className="px-6 py-3">
                      <Link
                        href={`/admin/artists/${artist.id}`}
                        className="block h-11 w-11 overflow-hidden rounded-md border border-gray-800 bg-[#0A0A0A]"
                        aria-label={`Edit ${artist.name}`}
                      >
                        <Image
                          src={artist.image || "/placeholder.svg"}
                          alt=""
                          width={44}
                          height={44}
                          className="h-full w-full object-cover object-top"
                        />
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Link
                        href={`/admin/artists/${artist.id}`}
                        className="font-bold transition-colors hover:text-[#7CFC00]"
                      >
                        {artist.name}
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-400">
                      {artist.genre}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-400">
                      {artist.location}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {artist.claimed ? (
                        <span className="font-bold text-green-400">✓ Claimed</span>
                      ) : (
                        <span className="text-gray-500">Not claimed</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-400">
                      {artist.email || "—"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-400">
                      {new Date(artist.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/artists/${artist.id}`}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                        {!artist.claimed && artist.email && (
                          <InviteArtistForm artistId={artist.id} email={artist.email} />
                        )}
                        {isSuperAdmin && (
                          <DeleteConfirm
                            action={deleteArtist.bind(null, artist.id)}
                            title="Delete Artist"
                            description={`Are you sure you want to delete "${artist.name}"? This action cannot be undone.`}
                          />
                        )}
                        {isSuperAdmin &&
                          (duplicateOptionsByArtistId.get(artist.id)?.length ?? 0) > 0 && (
                            <form
                              action={mergeArtistRecords.bind(null, artist.id)}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <select
                                name="targetArtistId"
                                className="h-9 border border-yellow-500/40 bg-black px-2 text-xs text-yellow-100"
                                aria-label={`Merge ${artist.name} into duplicate artist`}
                              >
                                {duplicateOptionsByArtistId.get(artist.id)?.map((candidate) => (
                                  <option key={candidate.id} value={candidate.id}>
                                    Merge into #{candidate.id}
                                    {candidate.claimed ? " claimed" : ""}
                                  </option>
                                ))}
                              </select>
                              <Button
                                type="submit"
                                variant="outline"
                                size="sm"
                                className="border-yellow-500/50 text-yellow-300"
                              >
                                Merge
                              </Button>
                            </form>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <AdminPagination
          pathname="/admin/artists"
          searchParams={currentSearchParams}
          page={page}
          totalItems={totalCount}
        />
      </div>
    </div>
  );
}
