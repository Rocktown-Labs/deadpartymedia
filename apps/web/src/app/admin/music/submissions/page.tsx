import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@clerk/nextjs/server";
import { desc, inArray } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { checkRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { musicReleases } from "@/lib/db/schema";
import { SubmissionsClient, type SubmissionItem } from "./submissions-client";

export default async function AdminMusicSubmissionsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  const isSuperAdmin = await checkRole("super_admin");
  const isWriter = await checkRole("writer");

  if (!isSuperAdmin && !isWriter) {
    redirect("/");
  }

  // Fetch all releases submitted by artists
  const rawSubmissions = await db
    .select()
    .from(musicReleases)
    .where(inArray(musicReleases.submissionStatus, ["pending", "approved", "declined"]))
    .orderBy(desc(musicReleases.createdAt));

  const submissions: SubmissionItem[] = rawSubmissions.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    artistName: r.artistName,
    releaseType: r.releaseType,
    genre: r.genre,
    releaseDate: r.releaseDate,
    coverArt: r.coverArt,
    audioUrl: r.audioUrl,
    excerpt: r.excerpt,
    spotifyUrl: r.spotifyUrl,
    appleMusicUrl: r.appleMusicUrl,
    bandcampUrl: r.bandcampUrl,
    youtubeUrl: r.youtubeUrl,
    submissionStatus: r.submissionStatus,
    declineReason: r.declineReason,
    createdAt: r.createdAt.toISOString(),
  }));

  const pendingCount = submissions.filter((s) => s.submissionStatus === "pending").length;

  return (
    <div>
      <div className="mb-6">
        <Link
          href={"/admin/music" as Route}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Music Releases
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">Artist Music Submissions</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Review, approve, or decline music releases submitted by Arkansas artists.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-3">
        <Link
          href={"/admin/music" as Route}
          className="px-3 py-1.5 rounded-md text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
        >
          All Releases
        </Link>
        <Link
          href={"/admin/music/submissions" as Route}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-zinc-800 text-white flex items-center gap-2"
        >
          <span>Artist Submissions</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#7CFC00] text-black">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>

      <SubmissionsClient initialSubmissions={submissions} />
    </div>
  );
}
