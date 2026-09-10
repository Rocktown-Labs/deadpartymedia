import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { musicReleases, users } from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { canEdit } from "@/lib/auth/access";
import { checkRole } from "@/lib/auth/roles";
import { MusicReleaseEditor } from "@/components/admin/music-release-editor";
import { updateMusicRelease } from "../actions";
import { createArtistProfileStub, createUserProfileStub } from "@/app/admin/users/actions";
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

  const isSuperAdmin = await checkRole("super_admin");
  const authorOptions = isSuperAdmin
    ? await db
        .select({
          clerkId: users.clerkId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        })
        .from(users)
        .where(inArray(users.role, ["writer", "super_admin"]))
        .orderBy(asc(users.firstName), asc(users.lastName))
        .then((rows) =>
          rows.map((row) => ({
            clerkId: row.clerkId,
            name: [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || row.email,
            role: row.role,
          })),
        )
    : [];

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Edit Release</h1>
      <MusicReleaseEditor
        initialData={{
          appleMusicUrl: release.appleMusicUrl,
          artistId: release.artistId,
          artistName: release.artistName,
          authorId: release.authorId,
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
        canManageAuthor={isSuperAdmin}
        authorOptions={authorOptions}
        onCreateAuthorStub={isSuperAdmin ? createUserProfileStub : undefined}
        onCreateArtistStub={isSuperAdmin ? createArtistProfileStub : undefined}
        onSubmit={updateMusicRelease.bind(null, releaseId)}
        cancelHref={"/admin/music" as Route}
        allowCoverImageUrl={true}
      />
    </div>
  );
}
