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
    "Explore new albums, singles, and releases from Arkansas underground and independent artists across all genres.",
  keywords: [
    "arkansas music releases",
    "new albums arkansas",
    "arkansas singles",
    "dead party media discography",
  ],
  openGraph: {
    description:
      "Explore new albums, singles, and releases from Arkansas underground and independent artists across all genres.",
    images: [{ alt: "Dead Party Media Music Releases", height: 630, url: ogImage, width: 1200 }],
    locale: "en_US",
    siteName,
    title: `Music Releases | ${siteName}`,
    type: "website",
    url: getAbsoluteUrl("/music"),
  },
  title: "Music Releases",
  twitter: {
    card: "summary_large_image",
    description:
      "Explore new albums, singles, and releases from Arkansas underground and independent artists across all genres.",
    images: [ogImage],
    title: `Music Releases | ${siteName}`,
  },
};

export default function MusicPageWrapper() {
  return <MusicPage />;
}
