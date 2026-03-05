import type { Metadata } from "next";
import { getAbsoluteUrl, getSiteDefaults } from "@/lib/seo";
import HipHopRAndBPage from "./hip-hop-page-client";

const { siteUrl, siteName } = getSiteDefaults();
const ogImage = `${siteUrl}/images/deadparty-hip-hop-og.jpg`;

export const metadata: Metadata = {
  alternates: {
    canonical: getAbsoluteUrl("/hip-hop-r-b"),
  },
  description:
    "Explore hip-hop and R&B articles, interviews, and features from Arkansas artists on Dead Party Media.",
  keywords: ["arkansas hip-hop", "r&b arkansas", "hip-hop articles", "dead party media"],
  openGraph: {
    description:
      "Explore hip-hop and R&B articles, interviews, and features from Arkansas artists on Dead Party Media.",
    images: [{ alt: "Dead Party Media Hip-Hop & R&B", height: 630, url: ogImage, width: 1200 }],
    locale: "en_US",
    siteName,
    title: `Hip-Hop & R&B | ${siteName}`,
    type: "website",
    url: getAbsoluteUrl("/hip-hop-r-b"),
  },
  title: "Hip-Hop & R&B",
  twitter: {
    card: "summary_large_image",
    description:
      "Explore hip-hop and R&B articles, interviews, and features from Arkansas artists on Dead Party Media.",
    images: [ogImage],
    title: `Hip-Hop & R&B | ${siteName}`,
  },
};

export default function HipHopPageWrapper() {
  return <HipHopRAndBPage />;
}
