import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/merch/")({
  component: () => <>Merch page</>,
  head: () => ({
    meta: [{ title: "Merch | Dead Party Media" }],
  }),
});
