import { createFileRoute } from "@tanstack/react-router";
import { AdminTable } from "../components/admin/admin-table";
import { apiFetchWithAuth } from "../lib/api";

interface ArtistRow {
  claimed: boolean;
  genre: string;
  id: number;
  name: string;
  slug: string;
}

/**
 * Admin artists list — ported from the Next admin
 * artists table (data+route; the tanstack-table client
 * with bulk actions is the visual parity pass). Writers are scoped to their
 * own rows by the API.
 */
export const Route = createFileRoute("/admin/artists/")({
  component: () => {
    const { error, rows, total } = Route.useLoaderData();
    return (
      <AdminTable
        columns={[
          {
            key: "name",
            label: "Artist",
            render: (row: ArtistRow) => <span className="font-semibold">{row.name}</span>,
          },
          { key: "genre", label: "Genre" },
          {
            key: "claimed",
            label: "Claimed",
            render: (row: ArtistRow) => (row.claimed ? "Yes" : "No"),
          },
          { key: "slug", label: "Slug" },
        ]}
        error={error}
        rows={rows}
        subtitle="Served by the platform API (staff-scoped)"
        title="Artists"
        total={total}
      />
    );
  },
  head: () => ({ meta: [{ title: "Admin: Artists | Dead Party Media" }] }),
  loader: async () => {
    const data = await apiFetchWithAuth<{ artists: ArtistRow[]; total: number }>(
      "/music/admin/artists?limit=50",
    ).catch(() => null);
    if (!data) {
      return { error: "Failed to load artists", rows: [], total: 0 };
    }
    return { error: null, rows: data.artists, total: data.total };
  },
});
