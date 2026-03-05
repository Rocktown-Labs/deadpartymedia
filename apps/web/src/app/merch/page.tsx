import type { Metadata } from "next";
import { getAbsoluteUrl, getSiteDefaults } from "@/lib/seo";
import MerchPageClient from "./merch-page-client";

const { siteName, siteUrl } = getSiteDefaults();
const ogImage = `${siteUrl}/images/dead-party-logo-og.jpg`;

export const metadata: Metadata = {
  alternates: {
    canonical: getAbsoluteUrl("/merch"),
  },
  description:
    "Shop official Dead Party Media merch, apparel, and accessories inspired by Arkansas music culture.",
  keywords: [
    "dead party media merch",
    "arkansas music merchandise",
    "music apparel",
    "dead party media store",
  ],
  openGraph: {
    description:
      "Shop official Dead Party Media merch, apparel, and accessories inspired by Arkansas music culture.",
    images: [{ alt: "Dead Party Media Merch", height: 630, url: ogImage, width: 1200 }],
    locale: "en_US",
    siteName,
    title: `Merch | ${siteName}`,
    type: "website",
    url: getAbsoluteUrl("/merch"),
  },
  title: "Merch",
  twitter: {
    card: "summary_large_image",
    description:
      "Shop official Dead Party Media merch, apparel, and accessories inspired by Arkansas music culture.",
    images: [ogImage],
    title: `Merch | ${siteName}`,
  },
};

export default function MerchPage() {
  return <MerchPageClient />;
}
