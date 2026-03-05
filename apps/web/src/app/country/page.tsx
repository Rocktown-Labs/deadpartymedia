import type { Metadata } from "next";
import { getAbsoluteUrl, getSiteDefaults } from "@/lib/seo";
import CountryPage from "./country-page-client";

const { siteUrl, siteName } = getSiteDefaults();
const ogImage = `${siteUrl}/images/deadparty-country-og.jpg`;

export const metadata: Metadata = {
  alternates: {
    canonical: getAbsoluteUrl("/country"),
  },
  description:
    "Explore country music articles, interviews, and features from Arkansas artists on Dead Party Media.",
  keywords: [
    "arkansas country music",
    "country artists arkansas",
    "country music articles",
    "dead party media",
  ],
  openGraph: {
    description:
      "Explore country music articles, interviews, and features from Arkansas artists on Dead Party Media.",
    images: [{ alt: "Dead Party Media Country Music", height: 630, url: ogImage, width: 1200 }],
    locale: "en_US",
    siteName,
    title: `Country | ${siteName}`,
    type: "website",
    url: getAbsoluteUrl("/country"),
  },
  title: "Country",
  twitter: {
    card: "summary_large_image",
    description:
      "Explore country music articles, interviews, and features from Arkansas artists on Dead Party Media.",
    images: [ogImage],
    title: `Country | ${siteName}`,
  },
};

export default function CountryPageWrapper() {
  return <CountryPage />;
}
