import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cart")({
  component: () => <>Cart page</>,
  head: () => ({
    meta: [{ title: "Cart | Dead Party Media" }],
  }),
});
