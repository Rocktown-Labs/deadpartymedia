import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/artist-dashboard/releases")({
  component: () => (
    <main className="pt-24 px-6">
      <div className="container mx-auto">
        <h1 className="text-3xl font-black">Your Releases</h1>
      </div>
    </main>
  ),
  head: () => ({ meta: [{ title: "Your Releases | Dead Party Media" }] }),
});
