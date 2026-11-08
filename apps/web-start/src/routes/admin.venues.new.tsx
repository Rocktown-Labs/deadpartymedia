import { createFileRoute } from "@tanstack/react-router";
import { EntityForm, type EntityField } from "../components/admin/entity-form";

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

/** New venue — create form. */
export const Route = createFileRoute("/admin/venues/new")({
  component: () => (
    <EntityForm endpoint="/music/admin/venues" fields={fields} initial={{}} title="Venue" />
  ),
  head: () => ({ meta: [{ title: "New Venue | Dead Party Media" }] }),
});
