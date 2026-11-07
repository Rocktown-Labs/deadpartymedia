import { createFileRoute } from "@tanstack/react-router";
import { GenrePage } from "../components/genre-page";
import { loadGenre } from "../lib/genre";

/** Ported from apps/web/src/app/edm/. */
export const Route = createFileRoute("/edm")({
  component: () => {
    const data = Route.useLoaderData();
    return (
      <GenrePage
        {...data}
        genre="EDM"
        subtitle="Arkansas electronic dance music coverage"
        title="EDM"
      />
    );
  },
  head: () => ({ meta: [{ title: "EDM | Dead Party Media" }] }),
  loader: () => loadGenre("EDM"),
});
