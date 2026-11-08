import { createFileRoute, notFound } from "@tanstack/react-router";
import { EntityForm, type EntityField } from "../components/admin/entity-form";
import { apiFetchWithAuth } from "../lib/api.server";

const fields: EntityField[] = [
  { key: "name", label: "Venue name" },
  { key: "slug", label: "Slug" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "address", label: "Address" },
  { key: "zip", label: "Zip" },
  { key: "phone", label: "Phone" },
  { key: "website", label: "Website" },
  { key: "capacity", label: "Capacity" },
  { key: "genres", label: "Genres note" },
  { key: "bookingEmail", label: "Booking email" },
  { key: "bookingRates", label: "Booking rates" },
  { key: "description", label: "Description", textarea: true },
];

/** Edit venue — loads the full row then renders the form. */
export const Route = createFileRoute("/admin/venues/$id")({
  component: () => {
    const { row } = Route.useLoaderData();
    return (
      <EntityForm
        endpoint="/music/admin/venues"
        fields={fields}
        id={row.id}
        initial={row}
        title="Venue"
      />
    );
  },
  head: () => ({ meta: [{ title: "Edit Venue | Dead Party Media" }] }),
  loader: async ({ params }) => {
    const data = await apiFetchWithAuth<{ venue: Record<string, unknown> }>(
      "/music/admin/venues/" + params.id,
    ).catch(() => null);
    if (!data?.venue) {
      throw notFound();
    }
    return { row: data.venue as Record<string, unknown> & { id: number } };
  },
});
