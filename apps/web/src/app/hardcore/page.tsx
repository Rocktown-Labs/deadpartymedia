import type { Metadata } from "next";
import { getAbsoluteUrl, getSiteDefaults } from "@/lib/seo";
import HardcorePage from "./hardcore-page-client";

const { siteUrl, siteName } = getSiteDefaults();
const ogImage = `${siteUrl}/images/deadparty-hardcore-rock-og.jpg`;

export const metadata: Metadata = {
  alternates: {
    canonical: getAbsoluteUrl("/hardcore"),
  },
  description:
    "Explore hardcore and rock music articles, interviews, and features from Arkansas artists on Dead Party Media.",
  keywords: ["arkansas hardcore", "rock music arkansas", "hardcore articles", "dead party media"],
  openGraph: {
    description:
      "Explore hardcore and rock music articles, interviews, and features from Arkansas artists on Dead Party Media.",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "Dead Party Media Hardcore & Rock" }],
    locale: "en_US",
    siteName,
    title: `Hardcore & Rock | ${siteName}`,
    type: "website",
    url: getAbsoluteUrl("/hardcore"),
  },
  title: "Hardcore & Rock",
  twitter: {
    card: "summary_large_image",
    description:
      "Explore hardcore and rock music articles, interviews, and features from Arkansas artists on Dead Party Media.",
    images: [ogImage],
    title: `Hardcore & Rock | ${siteName}`,
  },
};

export default function HardcorePageWrapper() {
  return <HardcorePage />;
}
