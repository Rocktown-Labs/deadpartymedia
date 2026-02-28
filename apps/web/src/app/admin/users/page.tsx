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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
        id: users.id,
        clerkId: users.clerkId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        onboardingComplete: users.onboardingComplete,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(userConditions)
      .orderBy(desc(users.createdAt)),
    db
      .select({
        id: artists.id,
        slug: artists.slug,
        name: artists.name,
        email: artists.email,
        genre: artists.genre,
        location: artists.location,
        claimed: artists.claimed,
        claimedById: artists.claimedById,
        createdAt: artists.createdAt,
      })
      .from(artists)
      .where(artistConditions)
      .orderBy(desc(artists.createdAt)),
  ]);

  const client = await clerkClient();
  const invitations = await client.invitations.getInvitationList();

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black">User Management</h1>
      </div>

      <div className="mb-8 bg-[#111111] border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Create Profile</h2>
        <p className="text-sm text-gray-400 mb-4">
          Create local user/artist profiles first, then send invites later once email is ready.
        </p>
        <form action={createProfileAction} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select
            name="profileType"
            defaultValue="user"
            className="bg-[#0A0A0A] border border-gray-800 rounded px-3 py-2"
          >
            <option value="user">User profile</option>
            <option value="artist">Artist profile</option>
          </select>
          <Input
            name="displayName"
            placeholder="Display name / Artist name"
            className="md:col-span-2"
            required
          />
          <select
            name="role"
            defaultValue="writer"
            className="bg-[#0A0A0A] border border-gray-800 rounded px-3 py-2"
          >
            <option value="writer">Writer</option>
            <option value="super_admin">Super Admin</option>
            <option value="fan">Fan</option>
          </select>
          <Input
            type="email"
            name="email"
            placeholder="Email (optional)"
            className="md:col-span-2"
          />
          <select
            name="genre"
            defaultValue="OTHER"
            className="bg-[#0A0A0A] border border-gray-800 rounded px-3 py-2"
          >
            <option value="OTHER">Genre: OTHER</option>
            <option value="COUNTRY">COUNTRY</option>
            <option value="EDM">EDM</option>
            <option value="HARDCORE & ROCK">HARDCORE & ROCK</option>
            <option value="HIP-HOP & R&B">HIP-HOP & R&B</option>
          </select>
          <Input name="location" placeholder="Artist location (optional)" />
          <Button type="submit" className="md:col-span-1">
            Create
          </Button>
        </form>
      </div>

      <div className="mb-6">
        <SearchUsers />
      </div>

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
                      {(invitation.publicMetadata as Record<string, string>)?.role || "fan"}
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

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Local User Profiles</h2>
        <div className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0A0A0A] border-b border-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase">Identity</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {localUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                    No profiles found
                  </td>
                </tr>
              ) : (
                localUsers.map((profile) => {
                  const placeholder = profile.clerkId.startsWith("local_placeholder:");
                  const placeholderEmail = isPlaceholderEmail(profile.email);
                  const canInvite = isInvitableRole(profile.role) && !placeholderEmail;

                  return (
                    <tr key={profile.id} className="hover:bg-gray-900">
                      <td className="px-6 py-4">{formatUserName(profile)}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{profile.email}</td>
                      <td className="px-6 py-4">
                        <form action={updateLocalUserRoleAction} className="flex gap-2 items-center">
                          <input type="hidden" name="id" value={profile.id} />
                          <select
                            name="role"
                            defaultValue={profile.role}
                            className="bg-[#0A0A0A] border border-gray-800 rounded px-2 py-1 text-sm"
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
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        <div>{placeholder ? "Local Placeholder" : "Clerk Linked"}</div>
                        <div className="text-xs text-gray-500">{profile.clerkId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          {placeholderEmail ? (
                            <form action={updateLocalUserEmailAction} className="flex gap-2 items-center">
                              <input type="hidden" name="id" value={profile.id} />
                              <Input
                                name="email"
                                type="email"
                                placeholder="Set real email"
                                className="h-8"
                                required
                              />
                              <Button type="submit" size="sm" variant="outline">
                                Save Email
                              </Button>
                            </form>
                          ) : null}
                          <div className="flex gap-2">
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Artist Profiles</h2>
        <div className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0A0A0A] border-b border-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase">Genre</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase">Claimed</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {localArtists.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                    No artists found
                  </td>
                </tr>
              ) : (
                localArtists.map((artistProfile) => {
                  const hasInviteEmail =
                    typeof artistProfile.email === "string" &&
                    artistProfile.email.length > 0 &&
                    !isPlaceholderEmail(artistProfile.email);
                  const canInvite = hasInviteEmail && !artistProfile.claimed;

                  return (
                    <tr key={artistProfile.id} className="hover:bg-gray-900">
                      <td className="px-6 py-4">{artistProfile.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{artistProfile.genre}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {artistProfile.email || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {artistProfile.claimed ? "Claimed" : "Unclaimed"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          {!hasInviteEmail ? (
                            <form action={updateArtistEmailAction} className="flex gap-2 items-center">
                              <input type="hidden" name="id" value={artistProfile.id} />
                              <Input
                                name="email"
                                type="email"
                                placeholder="Set real email"
                                className="h-8"
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
