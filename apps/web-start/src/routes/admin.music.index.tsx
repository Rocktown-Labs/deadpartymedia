import { createFileRoute } from "@tanstack/react-router";
import { AdminTable } from "../components/admin/admin-table";
import { apiFetchWithAuth } from "../lib/api";

interface ReleaseRow {
  artistName: string;
  id: number;
  releaseType: string;
  status: string;
  title: string;
}

/**
 * Admin music list — ported from the Next admin
 * music table (data+route; the tanstack-table client
 * with bulk actions is the visual parity pass). Writers are scoped to their
 * own rows by the API.
 */
export const Route = createFileRoute("/admin/music/")({
  component: () => {
    const { error, rows, total } = Route.useLoaderData();
    return (
      <AdminTable
        columns={[
          {
            key: "title",
            label: "Release",
            render: (row: ReleaseRow) => <span className="font-semibold">{row.title}</span>,
          },
          { key: "artistName", label: "Artist" },
          { key: "releaseType", label: "Type" },
          {
            key: "status",
            label: "Status",
            render: (row: ReleaseRow) => (
              <span className={row.status === "published" ? "text-[#7CFC00]" : "text-yellow-400"}>
                {row.status}
              </span>
            ),
          },
        ]}
        error={error}
        rows={rows}
        subtitle="Served by the platform API (staff-scoped)"
        title="Music"
        total={total}
      />
    );
  },
  head: () => ({ meta: [{ title: "Admin: Music | Dead Party Media" }] }),
  loader: async () => {
    const data = await apiFetchWithAuth<{ releases: ReleaseRow[]; total: number }>(
      "/music/admin/music?limit=50",
    ).catch(() => null);
    if (!data) {
      return { error: "Failed to load music", rows: [], total: 0 };
    }
    return { error: null, rows: data.releases, total: data.total };
  },
});
