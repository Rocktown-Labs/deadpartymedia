import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { musicReleases, artists } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Disc, Plus, Clock, CheckCircle2, XCircle } from "lucide-react";

export default async function ArtistReleasesPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  // Find the artist profile claimed by this user
  const [artist] = await db.select().from(artists).where(eq(artists.claimedById, userId)).limit(1);

  // Fetch all releases for this artist
  const artistReleases = await db
    .select()
    .from(musicReleases)
    .where(artist ? eq(musicReleases.artistId, artist.id) : eq(musicReleases.authorId, userId))
    .orderBy(desc(musicReleases.createdAt));

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-36 pb-20">
        <div className="container mx-auto px-6 max-w-5xl">
          <Link
            href={"/artist-dashboard" as Route}
            className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Artist Dashboard
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-zinc-800">
            <div>
              <h1 className="text-3xl font-black">My Music Releases</h1>
              <p className="text-zinc-400 text-sm mt-1">
                Track your music submissions, review statuses, and published features.
              </p>
            </div>
            <Link href={"/artist-dashboard/releases/new" as Route}>
              <Button className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90 font-bold gap-2">
                <Plus className="w-4 h-4" /> Submit New Release
              </Button>
            </Link>
          </div>

          {artistReleases.length === 0 ? (
            <div className="bg-[#111111] border border-zinc-800 rounded-xl p-12 text-center">
              <Disc className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <h2 className="text-lg font-bold mb-1">No Music Submitted Yet</h2>
              <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
                Have a new single, album, or music video? Submit it to the Dead Party editorial team
                to get featured.
              </p>
              <Link href={"/artist-dashboard/releases/new" as Route}>
                <Button className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90 font-bold">
                  Submit Your First Release
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {artistReleases.map((release) => {
                const isPending = release.submissionStatus === "pending";
                const isApproved =
                  release.submissionStatus === "approved" || release.status === "published";
                const isDeclined = release.submissionStatus === "declined";

                return (
                  <div
                    key={release.id}
                    className="p-5 rounded-xl bg-[#111111] border border-zinc-800/80 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      {release.coverArt ? (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-800 bg-black shrink-0">
                          <Image
                            src={release.coverArt}
                            alt={release.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                          <Disc className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-white text-base">{release.title}</h3>
                          <Badge variant="outline" className="text-[10px] border-zinc-700">
                            {release.releaseType}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] border-zinc-700">
                            {release.genre}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-400 line-clamp-1 max-w-xl">
                          {release.excerpt}
                        </p>
                        {release.releaseDate && (
                          <span className="text-[11px] text-zinc-500 font-mono mt-1 block">
                            Date: {release.releaseDate}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2 shrink-0">
                      {isPending && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-semibold">
                          <Clock className="w-3.5 h-3.5" /> Pending Review
                        </div>
                      )}
                      {isApproved && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7CFC00]/10 border border-[#7CFC00]/20 text-[#7CFC00] text-xs font-mono font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Published
                        </div>
                      )}
                      {isDeclined && (
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono font-semibold">
                            <XCircle className="w-3.5 h-3.5" /> Declined
                          </div>
                          {release.declineReason && (
                            <p className="text-xs text-zinc-400 max-w-xs">
                              Note: {release.declineReason}
                            </p>
                          )}
                        </div>
                      )}

                      {isApproved && (
                        <Link href={`/music/${release.slug}` as Route}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-[#7CFC00] hover:bg-[#7CFC00]/10 h-7 px-2"
                          >
                            View Live Post
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
