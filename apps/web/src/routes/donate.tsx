import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/donate")({
  component: () => <>Donate page</>,
  head: () => ({
    meta: [{ title: "Support Dead Party Media" }],
  }),
});
