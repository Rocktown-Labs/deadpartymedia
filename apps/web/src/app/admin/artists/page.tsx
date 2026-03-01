import Link from "next/link";
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
import { deleteArtist } from "./actions";
import { InviteArtistForm } from "./invite-artist-form";

const ARTIST_SORT_FIELDS = ["name", "genre", "location", "claimed", "email", "createdAt"] as const;

type ArtistSortField = (typeof ARTIST_SORT_FIELDS)[number];

type ArtistsSearchParams = {
  order?: string;
  page?: string;
  sort?: string;
};

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

  const totalCount = Number(totalRows[0]?.total ?? 0);
  const currentSearchParams = buildSearchParams(params);

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
                  <TableCell colSpan={7} className="px-6 py-4 text-center text-gray-400">
                    No artists found
                  </TableCell>
                </TableRow>
              ) : (
                allArtists.map((artist) => (
                  <TableRow key={artist.id} className="border-gray-800 hover:bg-gray-900">
                    <TableCell className="px-6 py-4">
                      <Link
                        href={`/admin/artists/${artist.id}`}
                        className="font-bold transition-colors hover:text-[#7CFC00]"
                      >
                        {artist.name}
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-400">{artist.genre}</TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-400">{artist.location}</TableCell>
                    <TableCell className="px-6 py-4">
                      {artist.claimed ? (
                        <span className="font-bold text-green-400">✓ Claimed</span>
                      ) : (
                        <span className="text-gray-500">Not claimed</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-400">{artist.email || "—"}</TableCell>
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
