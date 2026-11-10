import { EventForm } from "@/components/admin/event-form";
import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { updateEvent } from "../actions";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["admin"]["events"][":id"].$get({
        param: { id: input.params.id },
        query: input.search,
      }),
    ),
  );

export default function EditEventPage({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const { eventId, event, artistIds } = data;
  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Edit Event</h1>
      <EventForm
        initialData={{
          artistIds,
          date: event.date,
          description: event.description,
          genre: event.genre,
          image: event.image || undefined,
          location: event.location,
          price: event.price || undefined,
          slug: event.slug,
          status: event.status,
          ticketLink: event.ticketLink || undefined,
          time: event.time || undefined,
          title: event.title,
          venue: event.venue,
          venueId: event.venueId || undefined,
        }}
        onSubmit={updateEvent.bind(null, eventId)}
        cancelHref={"/admin/events"}
      />
    </div>
  );
}
