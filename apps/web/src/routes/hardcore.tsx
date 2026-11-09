import HardcorePage from "@/app/hardcore/hardcore-page-client";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/hardcore")({
  component: () => <HardcorePage />,
  head: () => ({
    meta: [{ title: "Hardcore | Dead Party Media" }],
  }),
});
