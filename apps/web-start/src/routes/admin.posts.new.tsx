import { createFileRoute } from "@tanstack/react-router";
import { PostEditor } from "../components/admin/post-editor";

/** New post screen — create mode of the admin post editor. */
export const Route = createFileRoute("/admin/posts/new")({
  component: () => <PostEditor initial={null} />,
  head: () => ({ meta: [{ title: "New Post | Dead Party Media" }] }),
});
