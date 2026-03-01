import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { canManageUsers } from "@/lib/auth/access";
import { clerkClient } from "@clerk/nextjs/server";
import { SearchUsers } from "./search-users";
import { RevokeInvitationButton } from "./revoke-invitation-button";
import {
  createProfile,
  deleteLocalUserProfile,
  inviteArtistProfile,
  inviteUserProfile,
  updateArtistEmail,
  updateLocalUserEmail,
  updateLocalUserRole,
} from "./actions";
import { db } from "@/lib/db";
import { artists, users } from "@/lib/db/schema";
import { desc, ilike, or } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateProfilePanel } from "./create-profile-panel";

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

async function createProfileAction(formData: FormData) {
  "use server";
  await createProfile(formData);
}

async function updateLocalUserRoleAction(formData: FormData) {
  "use server";
  await updateLocalUserRole(formData);
}

async function updateLocalUserEmailAction(formData: FormData) {
  "use server";
  await updateLocalUserEmail(formData);
}

async function inviteUserProfileAction(formData: FormData) {
  "use server";
  await inviteUserProfile(formData);
}

async function deleteLocalUserProfileAction(formData: FormData) {
  "use server";
  await deleteLocalUserProfile(formData);
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
  searchParams: Promise<{ search?: string }>;
}) {
  if (!(await canManageUsers())) {
    redirect("/admin");
  }

  const params = await searchParams;
  const query = params.search?.trim() || "";

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

  const [localUsers, localArtists] = await Promise.all([
    db
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
      .from(users)
      .where(userConditions)
      .orderBy(desc(users.createdAt)),
    db
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
      .from(artists)
      .where(artistConditions)
      .orderBy(desc(artists.createdAt)),
  ]);

  const client = await clerkClient();
  const invitations = await client.invitations.getInvitationList();

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
        <SearchUsers />
      </div>

      {invitations.data.length > 0 && (
        <Card className="border-gray-800 bg-[#111111]">
          <CardHeader>
            <CardTitle className="text-xl">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.data.map((invitation) => (
                    <TableRow key={invitation.id} className="border-gray-800 hover:bg-[#0F0F0F]">
                      <TableCell>{invitation.emailAddress}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-gray-700 text-gray-300">
                          {(invitation.publicMetadata as Record<string, string>)?.role || "fan"}
                        </Badge>
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
          </CardContent>
        </Card>
      )}

      <Card className="border-gray-800 bg-[#111111]">
        <CardHeader>
          <CardTitle className="text-xl">Local User Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Identity</TableHead>
                  <TableHead className="min-w-[19rem]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localUsers.length === 0 ? (
                  <TableRow className="border-gray-800">
                    <TableCell colSpan={5} className="py-8 text-center text-gray-400">
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
                          <form
                            action={updateLocalUserRoleAction}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <input type="hidden" name="id" value={profile.id} />
                            <select
                              name="role"
                              defaultValue={profile.role}
                              className="h-8 rounded-md border border-gray-800 bg-[#0A0A0A] px-2 py-1 text-sm"
                            >
                              <option value="writer">Writer</option>
                              <option value="super_admin">Super Admin</option>
                              <option value="fan">Fan</option>
                              <option value="artist">Artist</option>
                            </select>
                            <Button type="submit" size="sm" variant="outline">
                              Save
                            </Button>
                          </form>
                        </TableCell>
                        <TableCell className="text-xs text-gray-400">
                          <div>{placeholder ? "Local Placeholder" : "Clerk Linked"}</div>
                          <div className="mt-1 truncate text-[11px] text-gray-500">
                            {profile.clerkId}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            {placeholderEmail ? (
                              <form
                                action={updateLocalUserEmailAction}
                                className="flex flex-wrap items-center gap-2"
                              >
                                <input type="hidden" name="id" value={profile.id} />
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
                            <div className="flex flex-wrap items-center gap-2">
                              <form action={inviteUserProfileAction}>
                                <input type="hidden" name="id" value={profile.id} />
                                <Button type="submit" size="sm" disabled={!canInvite}>
                                  Invite
                                </Button>
                              </form>
                              <form action={deleteLocalUserProfileAction}>
                                <input type="hidden" name="id" value={profile.id} />
                                <Button type="submit" size="sm" variant="destructive">
                                  Delete
                                </Button>
                              </form>
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
        </CardContent>
      </Card>

      <Card className="border-gray-800 bg-[#111111]">
        <CardHeader>
          <CardTitle className="text-xl">Artist Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Claimed</TableHead>
                  <TableHead className="min-w-[19rem]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localArtists.length === 0 ? (
                  <TableRow className="border-gray-800">
                    <TableCell colSpan={5} className="py-8 text-center text-gray-400">
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
        </CardContent>
      </Card>
    </div>
  );
}
