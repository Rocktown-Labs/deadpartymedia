import type { Metadata } from "next";
import { getAbsoluteUrl, getSiteDefaults } from "@/lib/seo";
import OtherPage from "./other-page-client";

const { siteUrl, siteName } = getSiteDefaults();
const ogImage = `${siteUrl}/images/deadparty-other-og.jpg`;

export const metadata: Metadata = {
  alternates: {
    canonical: getAbsoluteUrl("/other"),
  },
  description:
    "Explore articles and features covering all other music genres from Arkansas artists on Dead Party Media.",
  keywords: ["arkansas music", "music articles", "arkansas artists", "dead party media"],
  openGraph: {
    description:
      "Explore articles and features covering all other music genres from Arkansas artists on Dead Party Media.",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "Dead Party Media Other Genres" }],
    locale: "en_US",
    siteName,
    title: `Other Genres | ${siteName}`,
    type: "website",
    url: getAbsoluteUrl("/other"),
  },
  title: "Other Genres",
  twitter: {
    card: "summary_large_image",
    description:
      "Explore articles and features covering all other music genres from Arkansas artists on Dead Party Media.",
    images: [ogImage],
    title: `Other Genres | ${siteName}`,
  },
};

export default function OtherPageWrapper() {
  return <OtherPage />;
}
