import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/")({
  component: () => (
    <main className="pt-24 px-6">
      <div className="container mx-auto">
        <h1 className="text-3xl font-black">Dashboard</h1>
        <p className="text-zinc-400">Fan dashboard</p>
      </div>
    </main>
  ),
  head: () => ({ meta: [{ title: "Dashboard | Dead Party Media" }] }),
});
