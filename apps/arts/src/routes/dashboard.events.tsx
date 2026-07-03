import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { ArtmakerDashboardShell } from "#/components/artmaker-dashboard-shell.tsx";
import { requireArtmakerDashboardUser } from "#/lib/artmakers.functions.ts";

export const Route = createFileRoute("/dashboard/events")({
  beforeLoad: () => requireArtmakerDashboardUser(),
  component: DashboardEvents,
});

function DashboardEvents() {
  return (
    <ArtmakerDashboardShell>
      <div className="mb-8">
        <h1 className="font-black text-4xl tracking-tight">Events</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Events that tag your artmaker profile will appear here once the event_artmakers workflow
          is wired into the admin editor.
        </p>
      </div>

      <div className="rounded-lg border border-gray-800 bg-[#111111] p-10 text-center">
        <CalendarDays className="mx-auto size-12 text-[#7CFC00]" />
        <h2 className="mt-5 font-black text-2xl">No tagged events yet</h2>
        <p className="mx-auto mt-3 max-w-md text-gray-400">
          Gallery nights, pop-ups, markets, and workshops connected to your profile will collect
          here.
        </p>
      </div>
    </ArtmakerDashboardShell>
  );
}
