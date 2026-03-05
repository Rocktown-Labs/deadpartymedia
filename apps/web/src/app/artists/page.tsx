import type { Metadata } from "next";
import { getAbsoluteUrl, getSiteDefaults } from "@/lib/seo";
import ArtistsPageClient from "./artists-page-client";

const { siteName, siteUrl } = getSiteDefaults();
const ogImage = `${siteUrl}/images/dead-party-logo-og.jpg`;

export const metadata: Metadata = {
  alternates: {
    canonical: getAbsoluteUrl("/artists"),
  },
  description:
    "Explore Arkansas artists across country, EDM, hardcore, hip-hop, and more on Dead Party Media.",
  keywords: [
    "arkansas artists",
    "arkansas musicians",
    "dead party media artists",
    "arkansas music scene",
  ],
  openGraph: {
    description:
      "Explore Arkansas artists across country, EDM, hardcore, hip-hop, and more on Dead Party Media.",
    images: [{ alt: "Dead Party Media Artists", height: 630, url: ogImage, width: 1200 }],
    locale: "en_US",
    siteName,
    title: `Artists | ${siteName}`,
    type: "website",
    url: getAbsoluteUrl("/artists"),
  },
  title: "Artists",
  twitter: {
    card: "summary_large_image",
    description:
      "Explore Arkansas artists across country, EDM, hardcore, hip-hop, and more on Dead Party Media.",
    images: [ogImage],
    title: `Artists | ${siteName}`,
  },
};

export default function ArtistsPage() {
  return <ArtistsPageClient />;
}
