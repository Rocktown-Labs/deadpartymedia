import type { Metadata } from "next";
import { getAbsoluteUrl, getSiteDefaults } from "@/lib/seo";
import { VenuesClient } from "./venues-client";

const { siteUrl, siteName } = getSiteDefaults();
const ogImage = `${siteUrl}/images/dead-party-logo-og.jpg`;

export const metadata: Metadata = {
  alternates: {
    canonical: getAbsoluteUrl("/venues"),
  },
  description:
    "Directory of Arkansas music venues, dive bars, stages, and concert halls hosting live local and touring acts.",
  openGraph: {
    description:
      "Directory of Arkansas music venues, dive bars, stages, and concert halls.",
    images: [{ alt: "Dead Party Media Venues", height: 630, url: ogImage, width: 1200 }],
    locale: "en_US",
    siteName,
    title: `Venues Directory | ${siteName}`,
    type: "website",
    url: getAbsoluteUrl("/venues"),
  },
  title: "Venues Directory",
};

export default function VenuesPage() {
  return <VenuesClient />;
}
