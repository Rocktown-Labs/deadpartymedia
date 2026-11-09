import { createFileRoute } from "@tanstack/react-router";
import ArtistsPageClient from "@/app/artists/artists-page-client";

export const Route = createFileRoute("/artists/")({
  component: () => <ArtistsPageClient />,
  head: () => ({ meta: [{ title: "Artists | Dead Party Media" }] }),
});
