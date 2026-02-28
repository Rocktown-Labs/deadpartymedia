import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { canManageUsers } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { posts, users } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  deleteLocalUserProfile,
  inviteUserProfile,
  updateLocalUserEmail,
  updateLocalUserRole,
} from "../actions";
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
  redirect("/admin/users");
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await canManageUsers())) {
    redirect("/admin");
  }

  const { id } = await params;
  const userId = Number.parseInt(id, 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    notFound();
  }

  const [profile] = await db
    .select({
      id: users.id,
      clerkId: users.clerkId,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      onboardingComplete: users.onboardingComplete,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!profile) {
    notFound();
  }

  const [postCountRows, latestPosts] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int`.as("count") })
      .from(posts)
      .where(eq(posts.authorId, profile.clerkId)),
    db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        status: posts.status,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .where(eq(posts.authorId, profile.clerkId))
      .orderBy(desc(posts.updatedAt))
      .limit(5),
  ]);

  const postCount = postCountRows[0]?.count ?? 0;
  const placeholderIdentity = profile.clerkId.startsWith("local_placeholder:");
  const placeholderEmail = isPlaceholderEmail(profile.email);
  const canInvite = isInvitableRole(profile.role) && !placeholderEmail;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button
          render={<Link href={"/admin/users" as Route} />}
          variant="outline"
          className="border-gray-700"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Users
        </Button>
        <div>
          <h1 className="text-3xl font-black">{formatUserName(profile)}</h1>
          <p className="mt-2 text-sm text-gray-400">Local profile id: {profile.id}</p>
        </div>
      </div>

      <Card className="border-gray-800 bg-[#111111]">
        <CardHeader>
          <CardTitle className="text-xl">Identity</CardTitle>
          <CardDescription>Reference and lifecycle data for this local user profile.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-gray-400">Email:</span> {profile.email}
            </p>
            <p>
              <span className="text-gray-400">Role:</span>{" "}
              <Badge variant="outline" className="border-gray-700 text-gray-200">
                {profile.role}
              </Badge>
            </p>
            <p>
              <span className="text-gray-400">Onboarding:</span>{" "}
              <Badge
                variant="outline"
                className={profile.onboardingComplete ? "border-emerald-700 text-emerald-300" : "border-gray-700 text-gray-300"}
              >
                {profile.onboardingComplete ? "Complete" : "Incomplete"}
              </Badge>
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="break-all">
              <span className="text-gray-400">Identity Type:</span>{" "}
              {placeholderIdentity ? "Local Placeholder" : "Clerk Linked"}
            </p>
            <p className="break-all">
              <span className="text-gray-400">Identity Id:</span> {profile.clerkId}
            </p>
            <p>
              <span className="text-gray-400">Created:</span> {profile.createdAt.toLocaleString()}
            </p>
            <p>
              <span className="text-gray-400">Updated:</span> {profile.updatedAt.toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-800 bg-[#111111]">
        <CardHeader>
          <CardTitle className="text-xl">Manage Profile</CardTitle>
          <CardDescription>Update role, email state, invitations, or remove this profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={updateLocalUserRoleAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={profile.id} />
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-gray-400">Role</label>
              <select
                name="role"
                defaultValue={profile.role}
                className="h-10 min-w-[12rem] rounded-md border border-gray-800 bg-[#0A0A0A] px-3 py-2 text-sm"
              >
                <option value="writer">Writer</option>
                <option value="super_admin">Super Admin</option>
                <option value="fan">Fan</option>
                <option value="artist">Artist</option>
              </select>
            </div>
            <Button type="submit" variant="outline">
              Save Role
            </Button>
          </form>

          <form action={updateLocalUserEmailAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={profile.id} />
            <div className="min-w-[18rem] flex-1">
              <label className="mb-1 block text-xs uppercase tracking-wider text-gray-400">Email</label>
              <Input name="email" type="email" defaultValue={profile.email} required />
            </div>
            <Button type="submit" variant="outline">
              Save Email
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-3 border-t border-gray-800 pt-4">
            <form action={inviteUserProfileAction}>
              <input type="hidden" name="id" value={profile.id} />
              <Button type="submit" disabled={!canInvite}>
                Send Invite
              </Button>
            </form>
            <form action={deleteLocalUserProfileAction}>
              <input type="hidden" name="id" value={profile.id} />
              <Button type="submit" variant="destructive">
                Delete Profile
              </Button>
            </form>
            {!canInvite ? (
              <p className="text-xs text-gray-400">
                Invite requires a non-placeholder email and writer/super_admin/artist role.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-800 bg-[#111111]">
        <CardHeader>
          <CardTitle className="text-xl">Authoring Activity</CardTitle>
          <CardDescription>
            {postCount} post(s) currently tied to this profile clerk identity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestPosts.length === 0 ? (
            <p className="text-sm text-gray-400">No posts yet for this user identity.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-[130px]">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestPosts.map((post) => (
                    <TableRow key={post.id} className="border-gray-800 hover:bg-[#0F0F0F]">
                      <TableCell className="font-medium">{post.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-gray-700 text-gray-300">
                          {post.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{post.updatedAt.toLocaleString()}</TableCell>
                      <TableCell>
                        <Button
                          render={<Link href={`/posts/${post.slug}` as Route} target="_blank" rel="noreferrer" />}
                          size="sm"
                          variant="outline"
                        >
                          View
                          <ExternalLink className="ml-1 size-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
