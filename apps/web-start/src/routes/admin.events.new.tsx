import { createFileRoute } from "@tanstack/react-router";
import { EntityForm, type EntityField } from "../components/admin/entity-form";

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

/** New event — create form. */
export const Route = createFileRoute("/admin/events/new")({
  component: () => (
    <EntityForm endpoint="/music/admin/events" fields={fields} initial={{}} title="Event" />
  ),
  head: () => ({ meta: [{ title: "New Event | Dead Party Media" }] }),
});
