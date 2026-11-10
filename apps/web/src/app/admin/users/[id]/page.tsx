import { getMusicApi } from "@/lib/api.server";
import { parseRole } from "@/lib/auth/role";
import { readResponse } from "@dpmedia/api-client";
import { Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["admin"]["users"][":id"].$get({
        param: { id: input.params.id },
        query: input.search,
      }),
    ),
  );

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  DeleteUserButton,
  InviteUserButton,
  UserEmailForm,
  UserRoleSelect,
} from "../client-actions";

function formatUserName(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.email;
}

export default function UserDetailPage({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const { profile, latestPosts, postCount, placeholderIdentity, placeholderEmail, canInvite } =
    data;
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          to={"/admin/users"}
          className={cn(buttonVariants({ variant: "outline" }), "border-gray-700")}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Users
        </Link>
        <div>
          <h1 className="text-3xl font-black">{formatUserName(profile)}</h1>
          <p className="mt-2 text-sm text-gray-400">Local profile id: {profile.id}</p>
        </div>
      </div>

      <Card className="border-gray-800 bg-[#111111]">
        <CardHeader>
          <CardTitle className="text-xl">Identity</CardTitle>
          <CardDescription>
            Reference and lifecycle data for this local user profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-gray-400">Email:</span> {profile.email}
            </p>
            <div>
              <span className="text-gray-400">Role:</span>{" "}
              <Badge variant="outline" className="border-gray-700 text-gray-200">
                {profile.role}
              </Badge>
            </div>
            <div>
              <span className="text-gray-400">Onboarding:</span>{" "}
              <Badge
                variant="outline"
                className={
                  profile.onboardingComplete
                    ? "border-emerald-700 text-emerald-300"
                    : "border-gray-700 text-gray-300"
                }
              >
                {profile.onboardingComplete ? "Complete" : "Incomplete"}
              </Badge>
            </div>
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
          <CardDescription>
            Update role, email state, invitations, or remove this profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <UserRoleSelect
              userId={profile.id}
              currentRole={parseRole(profile.role) || "fan"}
              layout="detail"
            />

            <UserEmailForm
              userId={profile.id}
              currentEmail={placeholderEmail ? "" : profile.email}
              layout="detail"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-gray-800 pt-4">
            <InviteUserButton
              userId={profile.id}
              disabled={!canInvite}
              size="default"
              label="Send Invite"
            />
            <DeleteUserButton
              userId={profile.id}
              redirectToUsers={true}
              size="default"
              label="Delete Profile"
            />
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
                        <Link
                          to="/article/$slug"
                          params={{ slug: post.slug }}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          View
                          <ExternalLink className="ml-1 size-3" />
                        </Link>
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
