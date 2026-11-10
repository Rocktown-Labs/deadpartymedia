import { getMusicApi } from "@/lib/api.server";
import { parseRole } from "@/lib/auth/role";
import { readResponse } from "@dpmedia/api-client";
import { Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(await getMusicApi().pages["admin"]["users"].$get({ query: input.search })),
  );

import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminSortHeader } from "@/components/admin/admin-sort-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createProfile, inviteArtistProfile, updateArtistEmail } from "./actions";
import {
  DeleteUserButton,
  InviteUserButton,
  UserEmailForm,
  UserRoleSelect,
} from "./client-actions";
import { CreateProfilePanel } from "./create-profile-panel";
import { RevokeInvitationButton } from "./revoke-invitation-button";
import { SearchUsers } from "./search-users";

const PLACEHOLDER_EMAIL_DOMAIN = "placeholder.deadpartymedia.local";

function isPlaceholderEmail(email: string) {
  return email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
}

function formatUserName(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.email;
}

function isInvitableRole(role: string) {
  return role === "writer" || role === "super_admin" || role === "artist";
}

function getInvitationRole(invitation: { publicMetadata?: unknown }) {
  return ((invitation.publicMetadata as Record<string, string>)?.role || "fan").toLowerCase();
}

function getInvitationCreatedAt(invitation: { createdAt?: Date | number | string | null }) {
  if (typeof invitation.createdAt === "number") {
    return invitation.createdAt;
  }

  if (typeof invitation.createdAt === "string") {
    return new Date(invitation.createdAt).getTime() || 0;
  }

  return invitation.createdAt?.getTime() ?? 0;
}

async function createProfileAction(formData: FormData) {
  await createProfile(formData);
}

async function updateArtistEmailAction(formData: FormData) {
  await updateArtistEmail(formData);
}

async function inviteArtistProfileAction(formData: FormData) {
  await inviteArtistProfile(formData);
}

export default function UsersPage({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const {
    params,
    query,
    invPage,
    usrPage,
    artPage,
    invOrder,
    usrOrder,
    artOrder,
    localUsers,
    localArtists,
    invitationTotal,
    pagedInvitations,
    localUsersTotal,
    localArtistsTotal,
    currentSearchParamsString,
  } = data;
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-black">User Management</h1>
        <p className="text-sm text-gray-400">
          Manage local user and artist profiles, then send production invites when records are
          ready.
        </p>
      </div>

      <CreateProfilePanel action={createProfileAction} />

      <div>
        <SearchUsers
          defaultValue={query}
          preservedSortAndOrder={{
            art_order: params.art_order,
            art_sort: params.art_sort,
            inv_order: params.inv_order,
            inv_sort: params.inv_sort,
            usr_order: params.usr_order,
            usr_sort: params.usr_sort,
          }}
        />
      </div>

      {invitationTotal > 0 && (
        <Card className="border-gray-800 bg-[#111111]">
          <CardHeader>
            <CardTitle className="text-xl">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto px-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead>
                      <AdminSortHeader
                        currentOrder={invOrder}
                        currentSort={params.inv_sort}
                        defaultSort="createdAt"
                        field="emailAddress"
                        label="Email"
                        orderParam="inv_order"
                        pageParam="inv_page"
                        pathname="/admin/users"
                        searchParams={new URLSearchParams(currentSearchParamsString)}
                        sortParam="inv_sort"
                      />
                    </TableHead>
                    <TableHead>
                      <AdminSortHeader
                        currentOrder={invOrder}
                        currentSort={params.inv_sort}
                        defaultSort="createdAt"
                        field="role"
                        label="Role"
                        orderParam="inv_order"
                        pageParam="inv_page"
                        pathname="/admin/users"
                        searchParams={new URLSearchParams(currentSearchParamsString)}
                        sortParam="inv_sort"
                      />
                    </TableHead>
                    <TableHead>
                      <AdminSortHeader
                        currentOrder={invOrder}
                        currentSort={params.inv_sort}
                        defaultSort="createdAt"
                        field="createdAt"
                        label="Created"
                        orderParam="inv_order"
                        pageParam="inv_page"
                        pathname="/admin/users"
                        searchParams={new URLSearchParams(currentSearchParamsString)}
                        sortParam="inv_sort"
                      />
                    </TableHead>
                    <TableHead className="w-[180px] text-xs font-bold uppercase tracking-wider text-gray-300">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedInvitations.map((invitation) => (
                    <TableRow key={invitation.id} className="border-gray-800 hover:bg-[#0F0F0F]">
                      <TableCell>{invitation.emailAddress}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-gray-700 text-gray-300">
                          {getInvitationRole(invitation)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invitation.createdAt
                          ? new Date(getInvitationCreatedAt(invitation)).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <RevokeInvitationButton
                          invitationId={invitation.id}
                          email={invitation.emailAddress}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <AdminPagination
              pathname="/admin/users"
              page={invPage}
              pageParam="inv_page"
              searchParams={new URLSearchParams(currentSearchParamsString)}
              totalItems={invitationTotal}
            />
          </CardContent>
        </Card>
      )}

      <Card className="border-gray-800 bg-[#111111]">
        <CardHeader>
          <CardTitle className="text-xl">Local User Profiles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto px-6">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead>
                    <AdminSortHeader
                      currentOrder={usrOrder}
                      currentSort={params.usr_sort}
                      defaultSort="createdAt"
                      field="name"
                      label="Name"
                      orderParam="usr_order"
                      pageParam="usr_page"
                      pathname="/admin/users"
                      searchParams={new URLSearchParams(currentSearchParamsString)}
                      sortParam="usr_sort"
                    />
                  </TableHead>
                  <TableHead>
                    <AdminSortHeader
                      currentOrder={usrOrder}
                      currentSort={params.usr_sort}
                      defaultSort="createdAt"
                      field="email"
                      label="Email"
                      orderParam="usr_order"
                      pageParam="usr_page"
                      pathname="/admin/users"
                      searchParams={new URLSearchParams(currentSearchParamsString)}
                      sortParam="usr_sort"
                    />
                  </TableHead>
                  <TableHead>
                    <AdminSortHeader
                      currentOrder={usrOrder}
                      currentSort={params.usr_sort}
                      defaultSort="createdAt"
                      field="role"
                      label="Role"
                      orderParam="usr_order"
                      pageParam="usr_page"
                      pathname="/admin/users"
                      searchParams={new URLSearchParams(currentSearchParamsString)}
                      sortParam="usr_sort"
                    />
                  </TableHead>
                  <TableHead>Identity</TableHead>
                  <TableHead>
                    <AdminSortHeader
                      currentOrder={usrOrder}
                      currentSort={params.usr_sort}
                      defaultSort="createdAt"
                      field="createdAt"
                      label="Created"
                      orderParam="usr_order"
                      pageParam="usr_page"
                      pathname="/admin/users"
                      searchParams={new URLSearchParams(currentSearchParamsString)}
                      sortParam="usr_sort"
                    />
                  </TableHead>
                  <TableHead className="min-w-[19rem] text-xs font-bold uppercase tracking-wider text-gray-300">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localUsers.length === 0 ? (
                  <TableRow className="border-gray-800">
                    <TableCell colSpan={6} className="py-8 text-center text-gray-400">
                      No profiles found
                    </TableCell>
                  </TableRow>
                ) : (
                  localUsers.map((profile) => {
                    const placeholder = profile.clerkId.startsWith("local_placeholder:");
                    const placeholderEmail = isPlaceholderEmail(profile.email);
                    const canInvite = isInvitableRole(profile.role) && !placeholderEmail;

                    return (
                      <TableRow key={profile.id} className="border-gray-800 hover:bg-[#0F0F0F]">
                        <TableCell>
                          <Link
                            to="/admin/users/$id"
                            params={{ id: String(profile.id) }}
                            className="font-medium text-white underline-offset-4 hover:text-[#7CFC00] hover:underline"
                          >
                            {formatUserName(profile)}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-gray-300">{profile.email}</TableCell>
                        <TableCell>
                          <UserRoleSelect
                            userId={profile.id}
                            currentRole={parseRole(profile.role) || "fan"}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-gray-400">
                          <div>{placeholder ? "Local Placeholder" : "Account Linked"}</div>
                          <div className="mt-1 truncate text-[11px] text-gray-500">
                            {profile.clerkId}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-300">
                          {new Date(profile.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            {placeholderEmail ? (
                              <UserEmailForm userId={profile.id} currentEmail="" />
                            ) : null}
                            <div className="flex flex-wrap items-center gap-2">
                              <InviteUserButton userId={profile.id} disabled={!canInvite} />
                              <DeleteUserButton userId={profile.id} />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <AdminPagination
            pathname="/admin/users"
            page={usrPage}
            pageParam="usr_page"
            searchParams={new URLSearchParams(currentSearchParamsString)}
            totalItems={localUsersTotal}
          />
        </CardContent>
      </Card>

      <Card className="border-gray-800 bg-[#111111]">
        <CardHeader>
          <CardTitle className="text-xl">Artist Profiles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto px-6">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead>
                    <AdminSortHeader
                      currentOrder={artOrder}
                      currentSort={params.art_sort}
                      defaultSort="createdAt"
                      field="name"
                      label="Name"
                      orderParam="art_order"
                      pageParam="art_page"
                      pathname="/admin/users"
                      searchParams={new URLSearchParams(currentSearchParamsString)}
                      sortParam="art_sort"
                    />
                  </TableHead>
                  <TableHead>
                    <AdminSortHeader
                      currentOrder={artOrder}
                      currentSort={params.art_sort}
                      defaultSort="createdAt"
                      field="genre"
                      label="Genre"
                      orderParam="art_order"
                      pageParam="art_page"
                      pathname="/admin/users"
                      searchParams={new URLSearchParams(currentSearchParamsString)}
                      sortParam="art_sort"
                    />
                  </TableHead>
                  <TableHead>
                    <AdminSortHeader
                      currentOrder={artOrder}
                      currentSort={params.art_sort}
                      defaultSort="createdAt"
                      field="email"
                      label="Email"
                      orderParam="art_order"
                      pageParam="art_page"
                      pathname="/admin/users"
                      searchParams={new URLSearchParams(currentSearchParamsString)}
                      sortParam="art_sort"
                    />
                  </TableHead>
                  <TableHead>
                    <AdminSortHeader
                      currentOrder={artOrder}
                      currentSort={params.art_sort}
                      defaultSort="createdAt"
                      field="claimed"
                      label="Claimed"
                      orderParam="art_order"
                      pageParam="art_page"
                      pathname="/admin/users"
                      searchParams={new URLSearchParams(currentSearchParamsString)}
                      sortParam="art_sort"
                    />
                  </TableHead>
                  <TableHead>
                    <AdminSortHeader
                      currentOrder={artOrder}
                      currentSort={params.art_sort}
                      defaultSort="createdAt"
                      field="createdAt"
                      label="Created"
                      orderParam="art_order"
                      pageParam="art_page"
                      pathname="/admin/users"
                      searchParams={new URLSearchParams(currentSearchParamsString)}
                      sortParam="art_sort"
                    />
                  </TableHead>
                  <TableHead className="min-w-[19rem] text-xs font-bold uppercase tracking-wider text-gray-300">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localArtists.length === 0 ? (
                  <TableRow className="border-gray-800">
                    <TableCell colSpan={6} className="py-8 text-center text-gray-400">
                      No artists found
                    </TableCell>
                  </TableRow>
                ) : (
                  localArtists.map((artistProfile) => {
                    const hasInviteEmail =
                      typeof artistProfile.email === "string" &&
                      artistProfile.email.length > 0 &&
                      !isPlaceholderEmail(artistProfile.email);
                    const canInvite = hasInviteEmail && !artistProfile.claimed;

                    return (
                      <TableRow
                        key={artistProfile.id}
                        className="border-gray-800 hover:bg-[#0F0F0F]"
                      >
                        <TableCell className="font-medium">{artistProfile.name}</TableCell>
                        <TableCell className="text-sm text-gray-300">
                          {artistProfile.genre}
                        </TableCell>
                        <TableCell className="text-sm text-gray-300">
                          {artistProfile.email || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              artistProfile.claimed
                                ? "border-emerald-700 text-emerald-300"
                                : "border-gray-700 text-gray-300"
                            }
                          >
                            {artistProfile.claimed ? "Claimed" : "Unclaimed"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-300">
                          {new Date(artistProfile.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            {!hasInviteEmail ? (
                              <form
                                action={updateArtistEmailAction}
                                className="flex flex-wrap items-center gap-2"
                              >
                                <input type="hidden" name="id" value={artistProfile.id} />
                                <Input
                                  name="email"
                                  type="email"
                                  placeholder="Set real email"
                                  className="h-8 min-w-[13rem]"
                                  required
                                />
                                <Button type="submit" size="sm" variant="outline">
                                  Save Email
                                </Button>
                              </form>
                            ) : null}
                            <form action={inviteArtistProfileAction}>
                              <input type="hidden" name="id" value={artistProfile.id} />
                              <Button type="submit" size="sm" disabled={!canInvite}>
                                Invite Artist
                              </Button>
                            </form>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <AdminPagination
            pathname="/admin/users"
            page={artPage}
            pageParam="art_page"
            searchParams={new URLSearchParams(currentSearchParamsString)}
            totalItems={localArtistsTotal}
          />
        </CardContent>
      </Card>
    </div>
  );
}
