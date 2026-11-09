import OtherPage from "@/app/other/other-page-client";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/other")({
  component: () => <OtherPage />,
  head: () => ({
    meta: [{ title: "Other | Dead Party Media" }],
  }),
});
