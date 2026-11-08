import { createFileRoute, notFound } from "@tanstack/react-router";
import { EntityForm, type EntityField } from "../components/admin/entity-form";
import { apiFetchWithAuth } from "../lib/api.server";

const fields: EntityField[] = [
  { key: "title", label: "Title" },
  { key: "slug", label: "Slug" },
  { key: "date", label: "Date (YYYY-MM-DD)", placeholder: "2026-12-31" },
  { key: "time", label: "Time", placeholder: "7:00 PM" },
  { key: "venue", label: "Venue" },
  { key: "location", label: "Location" },
  {
    key: "genre",
    label: "Genre",
    options: ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"],
  },
  { key: "status", label: "Status", options: ["draft", "published", "past"] },
  { key: "description", label: "Description", textarea: true },
  { key: "image", label: "Image URL" },
  { key: "price", label: "Price" },
  { key: "ticketLink", label: "Ticket link" },
];

/** Edit event — loads the full row then renders the form. */
export const Route = createFileRoute("/admin/events/$id")({
  component: () => {
    const { row } = Route.useLoaderData();
    return (
      <EntityForm
        endpoint="/music/admin/events"
        fields={fields}
        id={row.id}
        initial={row}
        title="Event"
      />
    );
  },
  head: () => ({ meta: [{ title: "Edit Event | Dead Party Media" }] }),
  loader: async ({ params }) => {
    const data = await apiFetchWithAuth<{ event: Record<string, unknown> }>(
      "/music/admin/events/" + params.id,
    ).catch(() => null);
    if (!data?.event) {
      throw notFound();
    }
    return { row: data.event as Record<string, unknown> & { id: number } };
  },
});
