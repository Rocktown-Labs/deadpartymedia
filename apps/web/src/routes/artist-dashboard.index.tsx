import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/artist-dashboard/")({
  component: () => (
    <main className="pt-24 px-6">
      <div className="container mx-auto">
        <h1 className="text-3xl font-black">Artist Dashboard</h1>
      </div>
    </main>
  ),
  head: () => ({ meta: [{ title: "Artist Dashboard | Dead Party Media" }] }),
});
