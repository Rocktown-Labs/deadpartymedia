import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { desc, count, ilike, or, asc } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
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
import {
  ADMIN_PAGE_SIZE,
  buildSearchParams,
  getOffsetFromPage,
  parsePageParam,
  parseSortOrderParam,
  parseSortParam,
} from "@/lib/admin/table-state";
import { canManageUsers } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { artists, users } from "@/lib/db/schema";
import { CreateProfilePanel } from "./create-profile-panel";
import { createProfile, inviteArtistProfile, updateArtistEmail } from "./actions";
import { RevokeInvitationButton } from "./revoke-invitation-button";
import { SearchUsers } from "./search-users";
import {
  UserRoleSelect,
  UserEmailForm,
  InviteUserButton,
  DeleteUserButton,
} from "./client-actions";

const PLACEHOLDER_EMAIL_DOMAIN = "placeholder.deadpartymedia.local";

const INVITATION_SORT_FIELDS = ["createdAt", "emailAddress", "role"] as const;
const USER_SORT_FIELDS = ["createdAt", "name", "email", "role"] as const;
const ARTIST_SORT_FIELDS = ["createdAt", "name", "genre", "email", "claimed"] as const;

type InvitationSortField = (typeof INVITATION_SORT_FIELDS)[number];
type UserSortField = (typeof USER_SORT_FIELDS)[number];
type ArtistSortField = (typeof ARTIST_SORT_FIELDS)[number];

interface UsersSearchParams {
  art_order?: string;
  art_page?: string;
  art_sort?: string;
  inv_order?: string;
  inv_page?: string;
  inv_sort?: string;
  search?: string;
  usr_order?: string;
  usr_page?: string;
  usr_sort?: string;
}

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
  "use server";
  await createProfile(formData);
}

async function updateArtistEmailAction(formData: FormData) {
  "use server";
  await updateArtistEmail(formData);
}

async function inviteArtistProfileAction(formData: FormData) {
  "use server";
  await inviteArtistProfile(formData);
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<UsersSearchParams>;
}) {
  if (!(await canManageUsers())) {
    redirect("/admin");
  }

  const params = await searchParams;
  const query = params.search?.trim() || "";

  const invPage = parsePageParam(params.inv_page);
  const usrPage = parsePageParam(params.usr_page);
  const artPage = parsePageParam(params.art_page);

  const invSort = parseSortParam<InvitationSortField>(
    params.inv_sort,
    INVITATION_SORT_FIELDS,
    "createdAt",
  );
  const usrSort = parseSortParam<UserSortField>(params.usr_sort, USER_SORT_FIELDS, "createdAt");
  const artSort = parseSortParam<ArtistSortField>(params.art_sort, ARTIST_SORT_FIELDS, "createdAt");

  const invOrder = parseSortOrderParam(params.inv_order, "desc");
  const usrOrder = parseSortOrderParam(params.usr_order, "desc");
  const artOrder = parseSortOrderParam(params.art_order, "desc");

  const userConditions = query
    ? or(
        ilike(users.email, `%${query}%`),
        ilike(users.firstName, `%${query}%`),
        ilike(users.lastName, `%${query}%`),
      )
    : undefined;
  const artistConditions = query
    ? or(ilike(artists.name, `%${query}%`), ilike(artists.email, `%${query}%`))
    : undefined;

  const userCountQuery = db.select({ total: count() }).from(users);
  const userRowsQuery = db
    .select({
      clerkId: users.clerkId,
      createdAt: users.createdAt,
      email: users.email,
      firstName: users.firstName,
      id: users.id,
      lastName: users.lastName,
      onboardingComplete: users.onboardingComplete,
      role: users.role,
    })
    .from(users);

  const artistCountQuery = db.select({ total: count() }).from(artists);
  const artistRowsQuery = db
    .select({
      claimed: artists.claimed,
      claimedById: artists.claimedById,
      createdAt: artists.createdAt,
      email: artists.email,
      genre: artists.genre,
      id: artists.id,
      location: artists.location,
      name: artists.name,
      slug: artists.slug,
    })
    .from(artists);

  const [localUsersTotalRows, localUsers, localArtistsTotalRows, localArtists, invitationsResult] =
    await Promise.all([
      userConditions ? userCountQuery.where(userConditions) : userCountQuery,
      (userConditions ? userRowsQuery.where(userConditions) : userRowsQuery)
        .orderBy(
          usrSort === "name"
            ? usrOrder === "asc"
              ? asc(users.firstName)
              : desc(users.firstName)
            : usrSort === "email"
              ? usrOrder === "asc"
                ? asc(users.email)
                : desc(users.email)
              : usrSort === "role"
                ? usrOrder === "asc"
                  ? asc(users.role)
                  : desc(users.role)
                : usrOrder === "asc"
                  ? asc(users.createdAt)
                  : desc(users.createdAt),
          usrSort === "name"
            ? usrOrder === "asc"
              ? asc(users.lastName)
              : desc(users.lastName)
            : desc(users.createdAt),
        )
        .limit(ADMIN_PAGE_SIZE)
        .offset(getOffsetFromPage(usrPage, ADMIN_PAGE_SIZE)),
      artistConditions ? artistCountQuery.where(artistConditions) : artistCountQuery,
      (artistConditions ? artistRowsQuery.where(artistConditions) : artistRowsQuery)
        .orderBy(
          artSort === "name"
            ? artOrder === "asc"
              ? asc(artists.name)
              : desc(artists.name)
            : artSort === "genre"
              ? artOrder === "asc"
                ? asc(artists.genre)
                : desc(artists.genre)
              : artSort === "email"
                ? artOrder === "asc"
                  ? asc(artists.email)
                  : desc(artists.email)
                : artSort === "claimed"
                  ? artOrder === "asc"
                    ? asc(artists.claimed)
                    : desc(artists.claimed)
                  : artOrder === "asc"
                    ? asc(artists.createdAt)
                    : desc(artists.createdAt),
          desc(artists.createdAt),
        )
        .limit(ADMIN_PAGE_SIZE)
        .offset(getOffsetFromPage(artPage, ADMIN_PAGE_SIZE)),
      (await clerkClient()).invitations.getInvitationList(),
    ]);

  const allInvitations = [...invitationsResult.data].toSorted((left, right) => {
    let comparison = 0;

    if (invSort === "emailAddress") {
      comparison = left.emailAddress.localeCompare(right.emailAddress);
    } else if (invSort === "role") {
      comparison = getInvitationRole(left).localeCompare(getInvitationRole(right));
    } else {
      comparison = getInvitationCreatedAt(left) - getInvitationCreatedAt(right);
    }

    return invOrder === "asc" ? comparison : comparison * -1;
  });

  const invitationTotal = allInvitations.length;
  const pagedInvitations = allInvitations.slice(
    getOffsetFromPage(invPage, ADMIN_PAGE_SIZE),
    getOffsetFromPage(invPage, ADMIN_PAGE_SIZE) + ADMIN_PAGE_SIZE,
  );

  const localUsersTotal = Number(localUsersTotalRows[0]?.total ?? 0);
  const localArtistsTotal = Number(localArtistsTotalRows[0]?.total ?? 0);

  const currentSearchParams = buildSearchParams(
    params as Record<string, string | string[] | undefined>,
  );

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
                        searchParams={currentSearchParams}
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
                        searchParams={currentSearchParams}
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
                        searchParams={currentSearchParams}
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
              searchParams={currentSearchParams}
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
                      searchParams={currentSearchParams}
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
                      searchParams={currentSearchParams}
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
                      searchParams={currentSearchParams}
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
                      searchParams={currentSearchParams}
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
                            href={`/admin/users/${profile.id}` as Route}
                            className="font-medium text-white underline-offset-4 hover:text-[#7CFC00] hover:underline"
                          >
                            {formatUserName(profile)}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-gray-300">{profile.email}</TableCell>
                        <TableCell>
                          <UserRoleSelect userId={profile.id} currentRole={profile.role} />
                        </TableCell>
                        <TableCell className="text-xs text-gray-400">
                          <div>{placeholder ? "Local Placeholder" : "Clerk Linked"}</div>
                          <div className="mt-1 truncate text-[11px] text-gray-500">
                            {profile.clerkId}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-300">
                          {profile.createdAt.toLocaleDateString()}
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
            searchParams={currentSearchParams}
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
                      searchParams={currentSearchParams}
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
                      searchParams={currentSearchParams}
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
                      searchParams={currentSearchParams}
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
                      searchParams={currentSearchParams}
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
                      searchParams={currentSearchParams}
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
                          {artistProfile.createdAt.toLocaleDateString()}
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
            searchParams={currentSearchParams}
            totalItems={localArtistsTotal}
          />
        </CardContent>
      </Card>
    </div>
  );
}
