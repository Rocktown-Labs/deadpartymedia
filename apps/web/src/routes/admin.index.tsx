import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  component: () => (
    <main className="pt-24 px-6">
      <div className="container mx-auto">
        <h1 className="text-3xl font-black">Admin</h1>
        <p className="text-zinc-400">Admin desk</p>
      </div>
    </main>
  ),
  head: () => ({ meta: [{ title: "Admin | Dead Party Media" }] }),
});
