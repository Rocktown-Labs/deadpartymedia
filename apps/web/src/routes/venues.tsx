import { createFileRoute } from "@tanstack/react-router";

const API_URL = process.env.API_URL ?? "http://localhost:8787";

export const Route = createFileRoute("/venues")({
  component: VenuesPage,
  head: () => ({ meta: [{ title: "Venues | Dead Party Media" }] }),
  loader: async () => {
    const venues = await fetch(API_URL + "/music/venues")
      .then((r) => r.json())
      .catch(() => []);
    return { venues };
  },
});

function VenuesPage() {
  const { venues } = Route.useLoaderData();
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white pt-[calc(var(--navbar-offset)+2rem)] pb-20 px-4 sm:px-6">
      <div className="container mx-auto">
        <h1 className="text-4xl font-black text-white mb-2">Venues</h1>
        <p className="text-sm text-zinc-400 mb-8">Where to catch live music in Arkansas</p>
        <ul className="space-y-3">
          {(venues as { city: string; id: number; name: string; state: string }[]).map((v) => (
            <li key={v.id} className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
              <h2 className="font-bold text-white">{v.name}</h2>
              <p className="text-sm text-zinc-400">
                {v.city}, {v.state}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
