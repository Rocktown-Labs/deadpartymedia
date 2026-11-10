import { getMusicApi } from "@/lib/api.server";
import type { PageMetadata as Metadata } from "@/lib/page-head";
import { getAbsoluteUrl, getSiteDefaults } from "@/lib/seo";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { VenuesClient } from "./venues-client";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(await getMusicApi().pages["venues"].$get({ query: input.search })),
  );

const { siteUrl, siteName } = getSiteDefaults();
const ogImage = `${siteUrl}/images/dead-party-logo-og.jpg`;

export const metadata: Metadata = {
  alternates: {
    canonical: getAbsoluteUrl("/venues"),
  },
  description:
    "Directory of Arkansas music venues, dive bars, stages, and concert halls hosting live local and touring acts.",
  openGraph: {
    description: "Directory of Arkansas music venues, dive bars, stages, and concert halls.",
    images: [{ alt: "Dead Party Media Venues", height: 630, url: ogImage, width: 1200 }],
    locale: "en_US",
    siteName,
    title: `Venues Directory | ${siteName}`,
    type: "website",
    url: getAbsoluteUrl("/venues"),
  },
  title: "Venues Directory",
};

export default function VenuesPage({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const { initialVenues } = data;
  return <VenuesClient initialVenues={initialVenues} />;
}
