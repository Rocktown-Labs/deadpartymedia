import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "../lib/api";

/**
 * First API-driven route: the loader reads the venue directory from the
 * platform API worker (apps/api GET /music/venues) server-side, replacing
 * the Next.js page's direct Drizzle query. Response shape is identical to
 * the Next.js /api/venues route the web app's react-query hooks consume.
 */
interface Venue {
  id: number;
  name: string;
  slug: string;
  address: string | null;
  city: string;
  state: string;
  zip: string | null;
  phone: string | null;
  website: string | null;
  capacity: string | null;
  genres: string | null;
  bookingRates: string | null;
  bookingEmail: string | null;
  description: string | null;
  image: string | null;
  createdAt: string;
}

interface VenueLoaderData {
  error: string | null;
  venues: Venue[];
}

export const Route = createFileRoute("/venues")({
  component: VenuesPage,
  head: () => ({
    meta: [{ title: "Venues | Dead Party Media" }],
  }),
  loader: async (): Promise<VenueLoaderData> => {
    try {
      const venues = await apiFetch<Venue[]>("/music/venues");
      return { error: null, venues };
    } catch {
      return { error: "Failed to load venues", venues: [] };
    }
  },
});

function VenuesPage() {
  const { error, venues } = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      <h1 className="mb-2 text-4xl font-black">Venues</h1>
      <p className="mb-8 text-sm text-gray-400">
        Served by the platform API worker (GET /music/venues)
      </p>

      {error ? (
        <p className="rounded-md border border-red-500/40 px-4 py-3 text-red-400">{error}</p>
      ) : venues.length === 0 ? (
        <p className="text-gray-400">No venues found.</p>
      ) : (
        <ul className="space-y-3">
          {venues.map((venue) => (
            <li
              className="flex items-baseline justify-between rounded-md border border-white/10 px-4 py-3"
              key={venue.id}
            >
              <span className="font-semibold">{venue.name}</span>
              <span className="text-sm text-gray-400">
                {[venue.city, venue.state].filter(Boolean).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
