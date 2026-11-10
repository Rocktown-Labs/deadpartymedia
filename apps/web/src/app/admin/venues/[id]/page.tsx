import { VenueForm } from "@/components/admin/venue-form";
import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { updateVenue } from "../actions";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["admin"]["venues"][":id"].$get({
        param: { id: input.params.id },
        query: input.search,
      }),
    ),
  );

export default function EditVenuePage({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const { venueId, venue } = data;
  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Edit Venue</h1>
      <VenueForm
        initialData={{
          address: venue.address,
          bookingEmail: venue.bookingEmail,
          bookingRates: venue.bookingRates,
          capacity: venue.capacity,
          city: venue.city,
          description: venue.description,
          genres: venue.genres,
          id: venue.id,
          image: venue.image,
          name: venue.name,
          phone: venue.phone,
          slug: venue.slug,
          state: venue.state,
          website: venue.website,
          zip: venue.zip,
        }}
        onSubmit={updateVenue.bind(null, venueId)}
        cancelHref={"/admin/venues"}
      />
    </div>
  );
}
