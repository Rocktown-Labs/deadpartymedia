import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { musicReleases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { canEdit } from "@/lib/auth/access";
import { MusicReleaseForm } from "@/components/admin/music-release-form";
import { updateMusicRelease } from "../actions";
import type { Route } from "next";

interface EditMusicReleasePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditMusicReleasePage({ params }: EditMusicReleasePageProps) {
  const { id } = await params;
  const releaseId = Number.parseInt(id, 10);

  if (Number.isNaN(releaseId)) {
    notFound();
  }

  const [release] = await db
    .select()
    .from(musicReleases)
    .where(eq(musicReleases.id, releaseId))
    .limit(1);

  if (!release) {
    notFound();
  }

  if (!(await canEdit(release.authorId))) {
    redirect("/admin/music" as Route);
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Edit Release</h1>
      <MusicReleaseForm
        initialData={{
          appleMusicUrl: release.appleMusicUrl,
          artistId: release.artistId,
          artistName: release.artistName,
          bandcampUrl: release.bandcampUrl,
          content: release.content,
          coverArt: release.coverArt,
          excerpt: release.excerpt,
          featured: release.featured,
          genre: release.genre,
          id: release.id,
          releaseDate: release.releaseDate,
          releaseType: release.releaseType as "Album" | "Single" | "EP",
          slug: release.slug,
          spotifyUrl: release.spotifyUrl,
          status: release.status as "draft" | "published" | "archived",
          title: release.title,
          youtubeUrl: release.youtubeUrl,
        }}
        onSubmit={updateMusicRelease.bind(null, releaseId)}
        cancelHref={"/admin/music" as Route}
      />
    </div>
  );
}
