import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contact")({
  component: () => <>Contact page</>,
  head: () => ({
    meta: [{ title: "Contact | Dead Party Media" }],
  }),
});
