import { createFileRoute } from "@tanstack/react-router";
import { GenrePage } from "../components/genre-page";
import { loadGenre } from "../lib/genre";

/** Ported from apps/web/src/app/hip-hop-r-b/. */
export const Route = createFileRoute("/hip-hop-r-b")({
  component: () => {
    const data = Route.useLoaderData();
    return (
      <GenrePage
        {...data}
        genre="HIP-HOP & R&B"
        subtitle="Arkansas hip-hop and R&B coverage"
        title="Hip-Hop & R&B"
      />
    );
  },
  head: () => ({ meta: [{ title: "Hip-Hop & R&B | Dead Party Media" }] }),
  loader: () => loadGenre("HIP-HOP & R&B"),
});
