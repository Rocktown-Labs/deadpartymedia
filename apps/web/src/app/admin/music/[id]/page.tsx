import { createArtistProfileStub, createUserProfileStub } from "@/app/admin/users/actions";
import { MusicReleaseEditor } from "@/components/admin/music-release-editor";
import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { updateMusicRelease } from "../actions";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["admin"]["music"][":id"].$get({
        param: { id: input.params.id },
        query: input.search,
      }),
    ),
  );

export default function EditMusicReleasePage({
  data,
}: {
  data: Awaited<ReturnType<typeof loadPage>>;
}) {
  const { releaseId, release, isSuperAdmin, authorOptions } = data;
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
        cancelHref={"/admin/music"}
        allowCoverImageUrl={true}
      />
    </div>
  );
}
