import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/venue-dashboard/")({
  component: () => (
    <main className="pt-24 px-6">
      <div className="container mx-auto">
        <h1 className="text-3xl font-black">Venue Dashboard</h1>
      </div>
    </main>
  ),
  head: () => ({ meta: [{ title: "Venue Dashboard | Dead Party Media" }] }),
});
