import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/posts/$id")({
  component: () => (
    <main className="pt-24 px-6">
      <div className="container mx-auto">
        <h1 className="text-3xl font-black">Edit Post</h1>
      </div>
    </main>
  ),
  head: () => ({ meta: [{ title: "Edit Post | Dead Party Media" }] }),
});
