import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/events/")({
  component: () => (
    <main className="pt-24 px-6">
      <div className="container mx-auto">
        <h1 className="text-3xl font-black">Admin: Events</h1>
      </div>
    </main>
  ),
  head: () => ({ meta: [{ title: "Admin: Events | Dead Party Media" }] }),
});
