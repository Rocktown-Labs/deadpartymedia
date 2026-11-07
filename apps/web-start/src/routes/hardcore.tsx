import { createFileRoute } from "@tanstack/react-router";
import { GenrePage } from "../components/genre-page";
import { loadGenre } from "../lib/genre";

/** Ported from apps/web/src/app/hardcore/. */
export const Route = createFileRoute("/hardcore")({
  component: () => {
    const data = Route.useLoaderData();
    return (
      <GenrePage
        {...data}
        genre="HARDCORE & ROCK"
        subtitle="Arkansas hardcore, punk, and rock coverage"
        title="Hardcore & Rock"
      />
    );
  },
  head: () => ({ meta: [{ title: "Hardcore & Rock | Dead Party Media" }] }),
  loader: () => loadGenre("HARDCORE & ROCK"),
});
