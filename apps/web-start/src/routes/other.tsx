import { createFileRoute } from "@tanstack/react-router";
import { GenrePage } from "../components/genre-page";
import { loadGenre } from "../lib/genre";

/** Ported from apps/web/src/app/other/. */
export const Route = createFileRoute("/other")({
  component: () => {
    const data = Route.useLoaderData();
    return (
      <GenrePage
        {...data}
        genre="OTHER"
        subtitle="Everything else in Arkansas music"
        title="Other"
      />
    );
  },
  head: () => ({ meta: [{ title: "Other | Dead Party Media" }] }),
  loader: () => loadGenre("OTHER"),
});
