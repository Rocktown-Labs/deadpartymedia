import HipHopRbPage from "@/app/hip-hop-r-b/hip-hop-page-client";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/hip-hop-r-b")({
  component: () => <HipHopRbPage />,
  head: () => ({
    meta: [{ title: "Hip-Hop & R&B | Dead Party Media" }],
  }),
});
