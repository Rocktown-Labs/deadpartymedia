import { createFileRoute } from "@tanstack/react-router";
import { ArtistPageClient } from "@/app/artists/[slug]/artist-page-client";

export const Route = createFileRoute("/artists/$slug")({
  component: () => <ArtistPageClient slug={Route.useParams().slug} />,
  head: ({ params }) => ({ meta: [{ title: params.slug + " | Dead Party Media" }] }),
});
