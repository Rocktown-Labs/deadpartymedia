import { createFileRoute } from "@tanstack/react-router";
import { ArtsAdminShell } from "#/components/arts-admin-shell.tsx";
import { listArtsStaffUsers } from "#/lib/admin.functions.ts";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";

export const Route = createFileRoute("/admin/users")({
  beforeLoad: () => requireArtsStaff(),
  component: AdminUsers,
  loader: () => listArtsStaffUsers(),
});

function AdminUsers() {
  const staff = Route.useRouteContext();
  const users = Route.useLoaderData();

  return (
    <ArtsAdminShell role={staff.role}>
      <div className="mb-8">
        <h1 className="font-black text-4xl tracking-tight">Staff</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Arts staff and writer management should mirror the web users portal. This readout confirms
          synced arts admin users from the shared users table.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]">
        {users.length > 0 ? (
          users.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 border-gray-800 border-b p-5 last:border-b-0"
            >
              <div>
                <h2 className="font-bold">
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
                </h2>
                <p className="mt-1 text-gray-500 text-sm">{user.email}</p>
              </div>
              <span className="rounded bg-[#7CFC00]/15 px-2 py-1 font-bold text-[#7CFC00] text-xs uppercase">
                {user.role}
              </span>
            </div>
          ))
        ) : (
          <p className="p-6 text-gray-400">No arts staff users are synced yet.</p>
        )}
      </div>
    </ArtsAdminShell>
  );
}
