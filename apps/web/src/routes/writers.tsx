import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/writers")({
  component: () => <>Writers page</>,
  head: () => ({
    meta: [{ title: "Writers | Dead Party Media" }],
  }),
});
