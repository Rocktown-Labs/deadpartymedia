import { createFileRoute } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { AdminDataTable } from "../components/admin/admin-data-table";
import { apiFetchWithAuth } from "../lib/api.server";
import { apiPost } from "../lib/api-client";

interface EventRow {
  date: string;
  id: number;
  status: string;
  title: string;
  venue: string;
}

const columnHelper = createColumnHelper<EventRow>();

/**
 * Admin events list — tanstack-table on the shared
 * AdminDataTable (bulk toggle + pagination).
 */
export const Route = createFileRoute("/admin/events/")({
  component: () => {
    const { error, rows } = Route.useLoaderData();
    if (error) {
      return <p className="rounded-md border border-red-500/40 px-4 py-3 text-red-400">{error}</p>;
    }
    return (
      <AdminDataTable
        bulkAction={{
          apply: async (row: EventRow) =>
            (await apiPost(`/music/admin/events/${row.id}/toggle`, {})).ok,
          label: "Toggle publish",
          toggle: (row: EventRow) => ({
            ...row,
            status: row.status === "published" ? "draft" : "published",
          }),
        }}
        columns={[
          columnHelper.accessor("title", {
            cell: (info) => <span className="font-semibold">{info.getValue()}</span>,
            header: "Event",
          }),
          columnHelper.accessor("date", {
            cell: (info) => <span className="text-[#7CFC00]">{info.getValue()}</span>,
            header: "Date",
          }),
          columnHelper.accessor("venue", { header: "Venue" }),
          columnHelper.accessor("status", {
            cell: (info) => (
              <span
                className={info.getValue() === "published" ? "text-[#7CFC00]" : "text-yellow-400"}
              >
                {info.getValue()}
              </span>
            ),
            header: "Status",
          }),
        ]}
        initialRows={rows}
        newTo="/admin/events/new"
        subtitle="Staff-scoped via the platform API"
        title="Events"
      />
    );
  },
  head: () => ({ meta: [{ title: "Admin: Events | Dead Party Media" }] }),
  loader: async () => {
    const data = await apiFetchWithAuth<{ events: EventRow[]; total: number }>(
      "/music/admin/events?limit=100",
    ).catch(() => null);
    if (!data) {
      return { error: "Failed to load events", rows: [] as never[] };
    }
    return { error: null, rows: data.events };
  },
});
