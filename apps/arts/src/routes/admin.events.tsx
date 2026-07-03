import { createFileRoute, Link } from "@tanstack/react-router";
import { ArtsAdminShell } from "#/components/arts-admin-shell.tsx";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";
import { listArtsEvents } from "#/lib/content.functions.ts";

export const Route = createFileRoute("/admin/events")({
  beforeLoad: () => requireArtsStaff(),
  component: AdminEvents,
  loader: () => listArtsEvents(),
});

function AdminEvents() {
  const staff = Route.useRouteContext();
  const events = Route.useLoaderData();

  return (
    <ArtsAdminShell role={staff.role}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-black text-4xl tracking-tight">Events</h1>
          <p className="mt-3 max-w-2xl text-gray-400">
            Arts events use the shared event system with vertical set to arts. AI flyer import
            should port here from web once upload endpoints land.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/admin/events/import"
            className="rounded-lg border border-[#7CFC00] bg-[#7CFC00] px-4 py-3 font-black text-black text-xs uppercase tracking-[0.18em] no-underline hover:bg-[#a5ff43]"
          >
            AI Flyer Import
          </Link>
          <Link
            to="/events"
            className="rounded-lg border border-gray-800 px-4 py-3 font-black text-white text-xs uppercase tracking-[0.18em] no-underline hover:border-[#7CFC00] hover:text-[#7CFC00]"
          >
            Public Events
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]">
        {events.length > 0 ? (
          events.map((event) => (
            <div key={event.id} className="border-gray-800 border-b p-5 last:border-b-0">
              <h2 className="font-bold text-lg">{event.title}</h2>
              <p className="mt-1 text-gray-500 text-sm">
                {event.venue}, {event.location} -{" "}
                {new Date(`${event.date}T00:00:00`).toLocaleDateString()}
              </p>
            </div>
          ))
        ) : (
          <p className="p-6 text-gray-400">No arts events are published yet.</p>
        )}
      </div>
    </ArtsAdminShell>
  );
}
