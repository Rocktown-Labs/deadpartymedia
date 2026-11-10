import { VenueForm } from "@/components/admin/venue-form";
import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { createVenue } from "../actions";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(await getMusicApi().pages["admin"]["venues"]["new"].$get({ query: input.search })),
  );

export default function NewVenuePage(_props: { data: Awaited<ReturnType<typeof loadPage>> }) {
  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Add New Venue</h1>
      <VenueForm onSubmit={createVenue} cancelHref={"/admin/venues"} />
    </div>
  );
}
