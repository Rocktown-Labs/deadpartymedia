import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { db } from "@/lib/db";
import { artists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ArtistReleaseForm } from "./artist-release-form";
import { submitArtistRelease } from "../actions";

export default async function NewArtistReleasePage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  const [artist] = await db.select().from(artists).where(eq(artists.claimedById, userId)).limit(1);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-36 pb-20">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-black mb-2">Submit Music Release</h1>
            <p className="text-zinc-400 text-sm">
              Submit your new single, EP, or album to Dead Party Media for review, editorial
              feature, and playlist inclusion.
            </p>
          </div>

          <ArtistReleaseForm
            artistName={artist?.name || "Independent Artist"}
            artistGenre={artist?.genre || "HARDCORE & ROCK"}
            onSubmit={submitArtistRelease}
            cancelHref={"/artist-dashboard/releases" as Route}
          />
        </div>
      </main>
    </div>
  );
}
