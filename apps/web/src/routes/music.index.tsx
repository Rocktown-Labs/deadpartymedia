import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/music/")({
  component: () => (
    <main className="min-h-screen bg-[#0A0A0A] text-white pt-[calc(var(--navbar-offset)+2rem)] pb-20 px-4 sm:px-6">
      <div className="container mx-auto">
        <h1 className="text-4xl font-black text-white mb-2">New Music</h1>
        <p className="text-sm text-zinc-400 mb-8">Latest releases from Arkansas artists</p>
      </div>
    </main>
  ),
  head: () => ({ meta: [{ title: "Music | Dead Party Media" }] }),
});
