import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: () => <>About page</>,
  head: () => ({
    meta: [{ title: "About | Dead Party Media" }],
  }),
});
