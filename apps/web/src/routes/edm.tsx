import EdmPage from "@/app/edm/edm-page-client";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/edm")({
  component: () => <EdmPage />,
  head: () => ({
    meta: [{ title: "EDM | Dead Party Media" }],
  }),
});
