import { createFileRoute } from "@tanstack/react-router";
import { AdminTable } from "../components/admin/admin-table";
import { apiFetchWithAuth } from "../lib/api";

interface EventRow {
  date: string;
  id: number;
  status: string;
  title: string;
  venue: string;
}

/**
 * Admin events list — ported from the Next admin
 * events table (data+route; the tanstack-table client
 * with bulk actions is the visual parity pass). Writers are scoped to their
 * own rows by the API.
 */
export const Route = createFileRoute("/admin/events/")({
  component: () => {
    const { error, rows, total } = Route.useLoaderData();
    return (
      <AdminTable
        columns={[
          {
            key: "title",
            label: "Event",
            render: (row: EventRow) => <span className="font-semibold">{row.title}</span>,
          },
          {
            key: "date",
            label: "Date",
            render: (row: EventRow) => <span className="text-[#7CFC00]">{row.date}</span>,
          },
          { key: "venue", label: "Venue" },
          { key: "status", label: "Status" },
        ]}
        error={error}
        rows={rows}
        subtitle="Served by the platform API (staff-scoped)"
        title="Events"
        total={total}
      />
    );
  },
  head: () => ({ meta: [{ title: "Admin: Events | Dead Party Media" }] }),
  loader: async () => {
    const data = await apiFetchWithAuth<{ events: EventRow[]; total: number }>(
      "/music/admin/events?limit=50",
    ).catch(() => null);
    if (!data) {
      return { error: "Failed to load events", rows: [], total: 0 };
    }
    return { error: null, rows: data.events, total: data.total };
  },
});
