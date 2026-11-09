import CountryPage from "@/app/country/country-page-client";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/country")({
  component: () => <CountryPage />,
  head: () => ({
    meta: [{ title: "Country | Dead Party Media" }],
  }),
});
