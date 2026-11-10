import { PostEditor } from "@/components/admin/post-editor";
import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { updatePost } from "../actions";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["admin"]["posts"][":id"].$get({
        param: { id: input.params.id },
        query: input.search,
      }),
    ),
  );

import { createArtistProfileStub, createUserProfileStub } from "@/app/admin/users/actions";

export default function EditPostPage({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const { postId, post, artistIds, isSuperAdmin, authorOptions } = data;
  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Edit Article</h1>
      <PostEditor
        initialData={{
          artistIds,
          authorId: post.authorId,
          category: post.category,
          content: post.content,
          coverImage: post.coverImage || undefined,
          excerpt: post.excerpt,
          isCoverStory: post.isCoverStory,
          slug: post.slug,
          status: post.status,
          title: post.title,
        }}
        canManageAuthor={isSuperAdmin}
        authorOptions={authorOptions}
        onCreateAuthorStub={isSuperAdmin ? createUserProfileStub : undefined}
        onCreateArtistStub={isSuperAdmin ? createArtistProfileStub : undefined}
        onSubmit={updatePost.bind(null, postId)}
        cancelHref={"/admin/posts"}
      />
    </div>
  );
}
