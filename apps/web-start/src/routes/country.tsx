import { createFileRoute } from "@tanstack/react-router";
import { GenrePage } from "../components/genre-page";
import { loadGenre } from "../lib/genre";

/** Ported from apps/web/src/app/country/. */
export const Route = createFileRoute("/country")({
  component: () => {
    const data = Route.useLoaderData();
    return (
      <GenrePage
        {...data}
        genre="COUNTRY"
        subtitle="Arkansas country and folk coverage"
        title="Country"
      />
    );
  },
  head: () => ({ meta: [{ title: "Country | Dead Party Media" }] }),
  loader: () => loadGenre("COUNTRY"),
});
