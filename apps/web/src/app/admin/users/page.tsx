import { redirect } from "next/navigation";
import { canManageUsers } from "@/lib/auth/access";
import { clerkClient } from "@clerk/nextjs/server";
import { SearchUsers } from "./search-users";
import { RoleSelectForm } from "./role-select-form";
import { InviteUserDialog } from "./invite-user-dialog";
import { DeleteConfirm } from "@/components/admin/delete-confirm";
import { deleteUser } from "./actions";
import { RevokeInvitationButton } from "./revoke-invitation-button";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  if (!(await canManageUsers())) {
    redirect("/admin");
  }

  const params = await searchParams;
  const query = params.search;

  const client = await clerkClient();
  const users = query
    ? (await client.users.getUserList({ query })).data
    : (await client.users.getUserList()).data;

  // Get pending invitations
  const invitations = await client.invitations.getInvitationList();

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black">User Management</h1>
        <InviteUserDialog />
      </div>

      <div className="mb-6">
        <SearchUsers />
      </div>

      {/* Pending Invitations */}
      {invitations.data.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Pending Invitations</h2>
          <div className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#0A0A0A] border-b border-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {invitations.data.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="px-6 py-4">{invitation.emailAddress}</td>
                    <td className="px-6 py-4">
                      {(invitation.publicMetadata as any)?.role || "fan"}
                    </td>
                    <td className="px-6 py-4">
                      <RevokeInvitationButton
                        invitationId={invitation.id}
                        email={invitation.emailAddress}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users List */}
      <div>
        <h2 className="text-xl font-bold mb-4">Users</h2>
        <div className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0A0A0A] border-b border-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-900">
                    <td className="px-6 py-4">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-6 py-4">
                      {
                        user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)
                          ?.emailAddress
                      }
                    </td>
                    <td className="px-6 py-4">
                      <RoleSelectForm
                        userId={user.id}
                        currentRole={(user.publicMetadata as any)?.role || "fan"}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <DeleteConfirm
                        onConfirm={deleteUser.bind(null, user.id)}
                        title="Delete User"
                        description={`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
