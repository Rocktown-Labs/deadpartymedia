import { createFileRoute } from "@tanstack/react-router";
import { EventPageClient } from "@/app/events/[slug]/event-page-client";

export const Route = createFileRoute("/events/$slug")({
  component: () => <EventPageClient slug={Route.useParams().slug} />,
  head: ({ params }) => ({ meta: [{ title: params.slug + " | Dead Party Media" }] }),
});
