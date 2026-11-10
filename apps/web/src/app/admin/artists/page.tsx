import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(await getMusicApi().pages["admin"]["artists"].$get({ query: input.search })),
  );

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
import { deleteArtist, mergeArtistRecords, setArtistHidden } from "./actions";
import { InviteArtistForm } from "./invite-artist-form";

export default function ArtistsPage({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const {
    isSuperAdmin,
    params,
    page,
    order,
    allArtists,
    totalCount,
    currentSearchParamsString,
    duplicateOptionsByArtistId,
  } = data;
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-black">Artists</h1>
        <div className="flex flex-wrap gap-2">
          {isSuperAdmin && (
            <Link to="/admin/artists/import">
              <Button variant="outline">Import Artist List</Button>
            </Link>
          )}
          <Link to="/admin/artists/new">
            <Button>Create New Artist</Button>
          </Link>
        </div>
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
                    searchParams={new URLSearchParams(currentSearchParamsString)}
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
                    searchParams={new URLSearchParams(currentSearchParamsString)}
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
                    searchParams={new URLSearchParams(currentSearchParamsString)}
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
                    searchParams={new URLSearchParams(currentSearchParamsString)}
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
                    searchParams={new URLSearchParams(currentSearchParamsString)}
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
                    searchParams={new URLSearchParams(currentSearchParamsString)}
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
                        to="/admin/artists/$id"
                        params={{ id: String(artist.id) }}
                        className="block h-11 w-11 overflow-hidden rounded-md border border-gray-800 bg-[#0A0A0A]"
                        aria-label={`Edit ${artist.name}`}
                      >
                        <img
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
                        to="/admin/artists/$id"
                        params={{ id: String(artist.id) }}
                        className="font-bold transition-colors hover:text-[#7CFC00]"
                      >
                        {artist.name}
                      </Link>
                      {artist.hidden && (
                        <div className="mt-1">
                          <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-yellow-300">
                            Hidden
                          </span>
                        </div>
                      )}
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
                        <Link to="/admin/artists/$id" params={{ id: String(artist.id) }}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                        {!artist.claimed && artist.email && (
                          <InviteArtistForm artistId={artist.id} email={artist.email} />
                        )}
                        {isSuperAdmin && (
                          <form action={setArtistHidden.bind(null, artist.id, !artist.hidden)}>
                            <Button
                              type="submit"
                              variant="outline"
                              size="sm"
                              className={
                                artist.hidden
                                  ? "border-green-500/50 text-green-300"
                                  : "border-yellow-500/50 text-yellow-300"
                              }
                            >
                              {artist.hidden ? "Unhide" : "Hide"}
                            </Button>
                          </form>
                        )}
                        {isSuperAdmin && (
                          <DeleteConfirm
                            action={deleteArtist.bind(null, artist.id)}
                            title="Delete Artist"
                            description={`Are you sure you want to delete "${artist.name}"? This action cannot be undone.`}
                          />
                        )}
                        {isSuperAdmin &&
                          (duplicateOptionsByArtistId[artist.id]?.length ?? 0) > 0 && (
                            <form
                              action={async (form) => {
                                await mergeArtistRecords(artist.id, form);
                              }}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <select
                                name="targetArtistId"
                                className="h-9 border border-yellow-500/40 bg-black px-2 text-xs text-yellow-100"
                                aria-label={`Merge ${artist.name} into duplicate artist`}
                              >
                                {duplicateOptionsByArtistId[artist.id]?.map((candidate) => (
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
          searchParams={new URLSearchParams(currentSearchParamsString)}
          page={page}
          totalItems={totalCount}
        />
      </div>
    </div>
  );
}
