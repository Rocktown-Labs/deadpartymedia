import { createFileRoute } from "@tanstack/react-router";
import { apiFetchWithAuth } from "../lib/api";

interface UserComment {
  content: string;
  createdAt: string;
  postTitle?: string;
}

/**
 * Ported from apps/web/src/app/dashboard/comments (reads GET /music/user/comments).
 */
export const Route = createFileRoute("/dashboard/comments")({
  component: CommentsPage,
  head: () => ({ meta: [{ title: "My Comments | Dead Party Media" }] }),
  loader: async () => {
    try {
      return await apiFetchWithAuth<UserComment[]>("/music/user/comments");
    } catch {
      return [] satisfies UserComment[];
    }
  },
});

function CommentsPage() {
  const comments = Route.useLoaderData();

  return (
    <>
      <h1 className="mb-6 text-3xl font-black">My comments</h1>
      {comments.length === 0 ? (
        <p className="text-gray-400">No comments yet — join the conversation on any article.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment, index) => (
            <li className="rounded-md border border-white/10 px-4 py-3" key={index}>
              {comment.postTitle ? (
                <p className="text-xs text-[#7CFC00]">{comment.postTitle}</p>
              ) : null}
              <p className="text-sm text-gray-200">{comment.content}</p>
              <p className="mt-1 text-xs text-gray-500">
                {new Date(comment.createdAt).toLocaleDateString("en-US")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
