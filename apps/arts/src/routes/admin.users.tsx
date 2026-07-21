import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArtsAdminShell } from "#/components/arts-admin-shell.tsx";
import { listArtsStaffUsers, updateArtsUserRole } from "#/lib/admin.functions.ts";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";

export const Route = createFileRoute("/admin/users")({
  beforeLoad: () => requireArtsStaff(),
  component: AdminUsers,
  loader: () => listArtsStaffUsers(),
});

type StaffUser = Awaited<ReturnType<typeof listArtsStaffUsers>>[number];

const ROLE_OPTIONS = [
  { label: "Super Admin", value: "super_admin" },
  { label: "Arts Admin", value: "arts_admin" },
  { label: "Arts Writer", value: "arts_writer" },
  { label: "Artmaker", value: "artmaker" },
  { label: "Fan", value: "fan" },
] as const;

function AdminUsers() {
  const staff = Route.useRouteContext();
  const initialUsers = Route.useLoaderData();
  const [usersList, setUsersList] = useState<StaffUser[]>(initialUsers);
  const updateRoleFn = useServerFn(updateArtsUserRole);

  const isSuperAdmin = staff.role === "super_admin" || staff.role === "admin";

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await updateRoleFn({
        data: {
          role: newRole as "artist" | "artmaker" | "arts_admin" | "arts_writer" | "fan" | "super_admin" | "writer",
          userId,
        },
      });
      toast.success("User role updated successfully");
      const updated = await listArtsStaffUsers();
      setUsersList(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user role");
    }
  };

  return (
    <ArtsAdminShell role={staff.role}>
      <div className="mb-8">
        <h1 className="font-black text-4xl tracking-tight">Staff & Users</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Manage staff permissions, writers, and user roles for Dead Party Arts.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]">
        {usersList.length > 0 ? (
          <div className="divide-y divide-gray-800">
            {usersList.map((user) => (
              <div
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-gray-900/50"
              >
                <div>
                  <h2 className="font-bold text-white text-base">
                    {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
                  </h2>
                  <p className="mt-1 text-gray-500 text-sm">{user.email}</p>
                </div>

                <div className="flex items-center gap-3">
                  {isSuperAdmin ? (
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="h-9 rounded-lg border border-gray-800 bg-[#0A0A0A] px-3 font-bold text-xs uppercase tracking-wider text-[#7CFC00] focus:outline-none"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded bg-[#7CFC00]/15 px-3 py-1 font-bold text-[#7CFC00] text-xs uppercase tracking-wider">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-8 text-center text-gray-400">No staff users registered yet.</p>
        )}
      </div>
    </ArtsAdminShell>
  );
}
