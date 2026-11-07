import { createFileRoute } from "@tanstack/react-router";
import { AdminTable } from "../components/admin/admin-table";
import { apiFetchWithAuth } from "../lib/api";

interface VenueRow {
  city: string;
  id: number;
  name: string;
  slug: string;
  state: string;
}

/**
 * Admin venues list — ported from the Next admin
 * venues table (data+route; the tanstack-table client
 * with bulk actions is the visual parity pass). Writers are scoped to their
 * own rows by the API.
 */
export const Route = createFileRoute("/admin/venues/")({
  component: () => {
    const { error, rows, total } = Route.useLoaderData();
    return (
      <AdminTable
        columns={[
          {
            key: "name",
            label: "Venue",
            render: (row: VenueRow) => <span className="font-semibold">{row.name}</span>,
          },
          { key: "city", label: "City" },
          { key: "state", label: "State" },
          { key: "slug", label: "Slug" },
        ]}
        error={error}
        rows={rows}
        subtitle="Served by the platform API (staff-scoped)"
        title="Venues"
        total={total}
      />
    );
  },
  head: () => ({ meta: [{ title: "Admin: Venues | Dead Party Media" }] }),
  loader: async () => {
    const data = await apiFetchWithAuth<{ venues: VenueRow[]; total: number }>(
      "/music/admin/venues?limit=50",
    ).catch(() => null);
    if (!data) {
      return { error: "Failed to load venues", rows: [], total: 0 };
    }
    return { error: null, rows: data.venues, total: data.total };
  },
});
