import { createFileRoute, Link } from "@tanstack/react-router";

/**
 * Scaffold landing for the TanStack Start successor of apps/web.
 * The real homepage (articles/events/releases + Fourthwall) migrates with
 * the rest of the routes — see MIGRATION.md in this app for the inventory.
 */
export const Route = createFileRoute("/")({
  component: ScaffoldHome,
});

function ScaffoldHome() {
  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      <p className="mb-2 text-sm font-mono text-[#7CFC00]">tanstack start migration scaffold</p>
      <h1 className="mb-4 text-4xl font-black md:text-6xl">Dead Party Media</h1>
      <p className="mb-8 max-w-2xl text-lg text-gray-300">
        This is the in-progress TanStack Start rebuild of deadpartymedia.com, running alongside the
        Next.js app until parity. Routed so far:
      </p>
      <div className="flex flex-wrap gap-4">
        <Link
          className="rounded-md border border-[#7CFC00]/40 px-4 py-2 text-[#7CFC00] hover:bg-[#7CFC00]/10"
          to="/about"
        >
          /about
        </Link>
        <Link
          className="rounded-md border border-[#7CFC00]/40 px-4 py-2 text-[#7CFC00] hover:bg-[#7CFC00]/10"
          to="/venues"
        >
          /venues
        </Link>
        <Link
          className="rounded-md border border-[#7CFC00]/40 px-4 py-2 text-[#7CFC00] hover:bg-[#7CFC00]/10"
          to="/articles"
        >
          /articles
        </Link>
        <Link
          className="rounded-md border border-[#7CFC00]/40 px-4 py-2 text-[#7CFC00] hover:bg-[#7CFC00]/10"
          to="/artists"
        >
          /artists
        </Link>
        <Link
          className="rounded-md border border-[#7CFC00]/40 px-4 py-2 text-[#7CFC00] hover:bg-[#7CFC00]/10"
          to="/events"
        >
          /events
        </Link>
        <Link
          className="rounded-md border border-[#7CFC00]/40 px-4 py-2 text-[#7CFC00] hover:bg-[#7CFC00]/10"
          to="/music"
        >
          /music
        </Link>
      </div>
    </main>
  );
}
