import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { apiFetch } from "../lib/api";
import { getSession } from "../lib/auth.functions";

interface VenueRow {
  id: number;
  name: string;
  slug: string;
}

/**
 * Ported from apps/web/src/app/venue-dashboard/layout.tsx: venue/super_admin
 * roles gate; the signed-in venue is resolved from Clerk publicMetadata
 * (venueId) against the venue directory, then provided to children.
 */
export const Route = createFileRoute("/venue-dashboard")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session.userId) {
      throw redirect({ to: "/sign-in" });
    }
    const authorized = session.roles.includes("venue") || session.roles.includes("super_admin");
    if (!authorized) {
      throw redirect({ to: "/dashboard" });
    }

    let venue: VenueRow | null = null;
    if (typeof session.metadata.venueId === "number") {
      const venues = await apiFetch<VenueRow[]>("/music/venues").catch(() => []);
      venue = venues.find((row) => row.id === session.metadata.venueId) ?? null;
    }

    return { session, venue };
  },
  component: VenueDashboardLayout,
});

function VenueDashboardLayout() {
  return <Outlet />;
}
