import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/history")({
  component: () => (
    <main className="pt-24 px-6">
      <div className="container mx-auto">
        <h1 className="text-3xl font-black">Reading History</h1>
      </div>
    </main>
  ),
  head: () => ({ meta: [{ title: "Reading History | Dead Party Media" }] }),
});
