import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/artist-dashboard/profile")({
  component: () => (
    <main className="pt-24 px-6">
      <div className="container mx-auto">
        <h1 className="text-3xl font-black">Profile</h1>
      </div>
    </main>
  ),
  head: () => ({ meta: [{ title: "Artist Profile | Dead Party Media" }] }),
});
