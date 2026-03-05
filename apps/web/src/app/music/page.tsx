import type { Metadata } from "next";
import { getAbsoluteUrl, getSiteDefaults } from "@/lib/seo";
import MusicPage from "./music-page-client";

const { siteUrl, siteName } = getSiteDefaults();
const ogImage = `${siteUrl}/images/dead-party-logo-og.jpg`;

export const metadata: Metadata = {
  alternates: {
    canonical: getAbsoluteUrl("/music"),
  },
  description:
    "Read the latest articles covering Arkansas music across all genres — country, EDM, hip-hop, R&B, hardcore, rock, and more.",
  keywords: ["arkansas music", "music articles", "arkansas artists", "dead party media"],
  openGraph: {
    description:
      "Read the latest articles covering Arkansas music across all genres — country, EDM, hip-hop, R&B, hardcore, rock, and more.",
    images: [{ alt: "Dead Party Media Music", height: 630, url: ogImage, width: 1200 }],
    locale: "en_US",
    siteName,
    title: `Music | ${siteName}`,
    type: "website",
    url: getAbsoluteUrl("/music"),
  },
  title: "Music",
  twitter: {
    card: "summary_large_image",
    description:
      "Read the latest articles covering Arkansas music across all genres — country, EDM, hip-hop, R&B, hardcore, rock, and more.",
    images: [ogImage],
    title: `Music | ${siteName}`,
  },
};

export default function MusicPageWrapper() {
  return <MusicPage />;
}
