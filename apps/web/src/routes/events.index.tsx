import { createFileRoute } from "@tanstack/react-router";
import { ShowsTable } from "@/components/events/shows-table";

export const Route = createFileRoute("/events/")({
  component: () => <ShowsTable events={[]} />,
  head: () => ({ meta: [{ title: "Events | Dead Party Media" }] }),
});
