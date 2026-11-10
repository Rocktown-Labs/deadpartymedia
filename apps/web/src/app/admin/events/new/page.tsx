import { EventForm } from "@/components/admin/event-form";
import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { createEvent } from "../actions";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(await getMusicApi().pages["admin"]["events"]["new"].$get({ query: input.search })),
  );

export default function NewEventPage(_props: { data: Awaited<ReturnType<typeof loadPage>> }) {
  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Create New Event</h1>
      <EventForm onSubmit={createEvent} cancelHref={"/admin/events"} allowImageUrl={false} />
    </div>
  );
}
