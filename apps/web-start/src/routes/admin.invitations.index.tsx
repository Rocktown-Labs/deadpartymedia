import { createFileRoute } from "@tanstack/react-router";
import { AdminTable } from "../components/admin/admin-table";
import { apiFetchWithAuth } from "../lib/api.server";

interface InvitationRow {
  createdAt: number | string;
  emailAddress: string;
  id: string;
  role: string;
  status: string;
}

/**
 * Admin invitations screen — ported from the users page's invitation list
 * (data+route; the invite form is the visual parity pass).
 */
export const Route = createFileRoute("/admin/invitations/")({
  component: () => {
    const { error, rows, total } = Route.useLoaderData();
    return (
      <AdminTable
        columns={[
          {
            key: "emailAddress",
            label: "Email",
            render: (row: InvitationRow) => (
              <span className="font-semibold">{row.emailAddress}</span>
            ),
          },
          {
            key: "role",
            label: "Role",
            render: (row: InvitationRow) => <span className="text-[#7CFC00]">{row.role}</span>,
          },
          { key: "status", label: "Status" },
        ]}
        error={error}
        rows={rows}
        subtitle="Pending Clerk invitations (music roles)"
        title="Invitations"
        total={total}
      />
    );
  },
  head: () => ({ meta: [{ title: "Admin: Invitations | Dead Party Media" }] }),
  loader: async () => {
    const data = await apiFetchWithAuth<{ invitations: InvitationRow[]; total: number }>(
      "/music/admin/invitations?limit=50",
    ).catch(() => null);
    if (!data) {
      return { error: "Failed to load invitations", rows: [], total: 0 };
    }
    return { error: null, rows: data.invitations, total: data.total };
  },
});
