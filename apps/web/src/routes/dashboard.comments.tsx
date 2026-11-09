import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/comments")({
  component: () => (
    <main className="pt-24 px-6">
      <div className="container mx-auto">
        <h1 className="text-3xl font-black">My Comments</h1>
      </div>
    </main>
  ),
  head: () => ({ meta: [{ title: "My Comments | Dead Party Media" }] }),
});
