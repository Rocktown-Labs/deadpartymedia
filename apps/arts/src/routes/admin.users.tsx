import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Mail, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ArtsAdminShell } from "#/components/arts-admin-shell.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import {
  inviteArtsUser,
  listArtsInvitations,
  listArtsStaffUsers,
  updateArtsUserRole,
} from "#/lib/admin.functions.ts";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";

export const Route = createFileRoute("/admin/users")({
  beforeLoad: () => requireArtsStaff(),
  component: AdminUsers,
  loader: async () => {
    const [usersList, invitations] = await Promise.all([
      listArtsStaffUsers(),
      listArtsInvitations(),
    ]);
    return { invitations, usersList };
  },
});

type StaffUser = Awaited<ReturnType<typeof listArtsStaffUsers>>[number];
type Invitation = Awaited<ReturnType<typeof listArtsInvitations>>[number];

const ROLE_OPTIONS = [
  { label: "Super Admin", value: "super_admin" },
  { label: "Arts Admin", value: "arts_admin" },
  { label: "Arts Writer", value: "arts_writer" },
  { label: "Artmaker", value: "artmaker" },
  { label: "Fan", value: "fan" },
] as const;

function AdminUsers() {
  const staff = Route.useRouteContext();
  const { invitations: initialInvitations, usersList: initialUsers } = Route.useLoaderData();
  const [usersList, setUsersList] = useState<StaffUser[]>(initialUsers);
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"arts_admin" | "arts_writer" | "artmaker" | "fan">(
    "arts_writer",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateRoleFn = useServerFn(updateArtsUserRole);
  const inviteUserFn = useServerFn(inviteArtsUser);

  const canManageStaff =
    staff.role === "super_admin" || staff.role === "admin" || staff.role === "arts_admin";
  const isSuperAdmin = staff.role === "super_admin" || staff.role === "admin";
  const availableRoleOptions = isSuperAdmin
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((opt) => opt.value !== "super_admin");

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await updateRoleFn({
        data: {
          role: newRole as
            | "artist"
            | "artmaker"
            | "arts_admin"
            | "arts_writer"
            | "fan"
            | "super_admin"
            | "writer",
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

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error("Email address is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await inviteUserFn({
        data: {
          email: inviteEmail.trim(),
          role: inviteRole,
        },
      });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setIsInviteModalOpen(false);
      setInviteEmail("");
      const updatedInvs = await listArtsInvitations();
      setInvitations(updatedInvs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ArtsAdminShell role={staff.role}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-black text-4xl tracking-tight">Staff & Users</h1>
          <p className="mt-3 max-w-2xl text-gray-400">
            Manage staff permissions, assign arts admin/writer roles, and invite creators to Dead
            Party Arts.
          </p>
        </div>
        {canManageStaff ? (
          <Button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="rounded-lg bg-[#7CFC00] font-black text-black text-xs uppercase tracking-[0.18em] hover:bg-[#7CFC00]/90"
          >
            <UserPlus className="mr-2 size-4" />
            Invite Staff / Creator
          </Button>
        ) : null}
      </div>

      <div className="space-y-8">
        {/* Active Users Table */}
        <section className="space-y-4">
          <h2 className="font-black text-xl text-white">Active Users & Staff</h2>
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
                      {canManageStaff ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="h-9 rounded-lg border border-gray-800 bg-[#0A0A0A] px-3 font-bold text-xs uppercase tracking-wider text-[#7CFC00] focus:outline-none"
                        >
                          {availableRoleOptions.map((opt) => (
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
        </section>

        {/* Pending Invitations Section */}
        {invitations.length > 0 ? (
          <section className="space-y-4">
            <h2 className="font-black text-xl text-white">Pending Invitations</h2>
            <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]">
              <div className="divide-y divide-gray-800">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-gray-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="size-5 text-[#7CFC00]" />
                      <div>
                        <p className="font-bold text-white text-sm">{inv.emailAddress}</p>
                        <p className="text-gray-500 text-xs">
                          Invited on {new Date(inv.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="rounded bg-gray-800 px-2.5 py-1 font-bold text-gray-300 text-xs uppercase">
                        {inv.role}
                      </span>
                      <span className="rounded bg-yellow-500/15 px-2.5 py-1 font-bold text-yellow-400 text-xs uppercase">
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-md rounded-xl border border-gray-800 bg-[#111111] p-6 space-y-6">
            <div className="flex items-center justify-between border-gray-800 border-b pb-4">
              <h2 className="font-black text-2xl text-white">Invite Staff or Creator</h2>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="invite-email"
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                  Email Address
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="writer@deadpartyarts.com"
                  className="font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="invite-role"
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                  Assign Role
                </Label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(
                      e.target.value as "arts_admin" | "arts_writer" | "artmaker" | "fan",
                    )
                  }
                  className="w-full h-10 rounded-lg border border-gray-800 bg-[#0A0A0A] px-3 font-bold text-white text-sm"
                >
                  <option value="arts_writer">Arts Writer</option>
                  <option value="arts_admin">Arts Admin</option>
                  <option value="artmaker">Artmaker / Artist</option>
                  <option value="fan">Fan / Member</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 border-gray-800 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#7CFC00] font-black text-black hover:bg-[#7CFC00]/90"
                >
                  {isSubmitting ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </ArtsAdminShell>
  );
}
