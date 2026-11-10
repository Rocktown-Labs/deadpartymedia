import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["venue-dashboard"]["events"]["new"].$get({ query: input.search }),
    ),
  );

import { EventForm } from "@/components/admin/event-form";
import { createVenueEvent } from "../actions";

export default function VenueNewEventPage({
  data,
}: {
  data: Awaited<ReturnType<typeof loadPage>>;
}) {
  const { userVenue, initialLocation } = data;
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-black mb-2">Submit New Show</h1>
            <p className="text-zinc-400 text-sm">
              List an upcoming concert or event hosted at {userVenue?.name || "your venue"}.
            </p>
          </div>

          <EventForm
            initialData={{
              location: initialLocation,
              venue: userVenue?.name || "",
              venueId: userVenue?.id,
            }}
            onSubmit={createVenueEvent}
            cancelHref={"/venue-dashboard"}
          />
        </div>
      </main>
    </div>
  );
}
