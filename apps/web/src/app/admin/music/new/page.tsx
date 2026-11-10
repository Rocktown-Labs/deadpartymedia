import { MusicReleaseEditor } from "@/components/admin/music-release-editor";
import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { createMusicRelease } from "../actions";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(await getMusicApi().pages["admin"]["music"]["new"].$get({ query: input.search })),
  );

import { createArtistProfileStub, createUserProfileStub } from "@/app/admin/users/actions";

export default function NewMusicReleasePage({
  data,
}: {
  data: Awaited<ReturnType<typeof loadPage>>;
}) {
  const { isSuperAdmin, authorOptions, defaultAuthorId } = data;
  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Create New Release</h1>
      <MusicReleaseEditor
        initialData={{ authorId: defaultAuthorId }}
        canManageAuthor={isSuperAdmin}
        authorOptions={authorOptions}
        onCreateAuthorStub={isSuperAdmin ? createUserProfileStub : undefined}
        onCreateArtistStub={isSuperAdmin ? createArtistProfileStub : undefined}
        onSubmit={createMusicRelease}
        cancelHref={"/admin/music"}
        allowCoverImageUrl={true}
      />
    </div>
  );
}
