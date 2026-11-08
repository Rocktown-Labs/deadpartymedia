import { createFileRoute } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { AdminDataTable } from "../components/admin/admin-data-table";
import { apiFetchWithAuth } from "../lib/api.server";
import { apiPost } from "../lib/api-client";

interface ReleaseRow {
  artistName: string;
  id: number;
  releaseType: string;
  status: string;
  title: string;
}

const columnHelper = createColumnHelper<ReleaseRow>();

/**
 * Admin music list — tanstack-table on the shared
 * AdminDataTable (bulk toggle + pagination).
 */
export const Route = createFileRoute("/admin/music/")({
  component: () => {
    const { error, rows } = Route.useLoaderData();
    if (error) {
      return <p className="rounded-md border border-red-500/40 px-4 py-3 text-red-400">{error}</p>;
    }
    return (
      <AdminDataTable
        bulkAction={{
          apply: async (row: ReleaseRow) =>
            (await apiPost(`/music/admin/music/${row.id}/toggle`, {})).ok,
          label: "Toggle publish",
          toggle: (row: ReleaseRow) => ({
            ...row,
            status: row.status === "published" ? "draft" : "published",
          }),
        }}
        columns={[
          columnHelper.accessor("title", {
            cell: (info) => <span className="font-semibold">{info.getValue()}</span>,
            header: "Release",
          }),
          columnHelper.accessor("artistName", { header: "Artist" }),
          columnHelper.accessor("releaseType", { header: "Type" }),
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
        newTo="/admin/music/new"
        subtitle="Staff-scoped via the platform API"
        title="Music"
      />
    );
  },
  head: () => ({ meta: [{ title: "Admin: Music | Dead Party Media" }] }),
  loader: async () => {
    const data = await apiFetchWithAuth<{ releases: ReleaseRow[]; total: number }>(
      "/music/admin/music?limit=100",
    ).catch(() => null);
    if (!data) {
      return { error: "Failed to load music", rows: [] as never[] };
    }
    return { error: null, rows: data.releases };
  },
});
