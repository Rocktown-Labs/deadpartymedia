import type { Metadata } from "next";
import { getAbsoluteUrl, getSiteDefaults } from "@/lib/seo";
import EdmPage from "./edm-page-client";

const { siteUrl, siteName } = getSiteDefaults();
const ogImage = `${siteUrl}/images/deadparty-edm-og.jpg`;

export const metadata: Metadata = {
  alternates: {
    canonical: getAbsoluteUrl("/edm"),
  },
  description:
    "Explore EDM articles, DJ interviews, and electronic music features from Arkansas artists on Dead Party Media.",
  keywords: ["arkansas edm", "electronic music arkansas", "edm articles", "dead party media"],
  openGraph: {
    description:
      "Explore EDM articles, DJ interviews, and electronic music features from Arkansas artists on Dead Party Media.",
    images: [{ alt: "Dead Party Media EDM", height: 630, url: ogImage, width: 1200 }],
    locale: "en_US",
    siteName,
    title: `EDM | ${siteName}`,
    type: "website",
    url: getAbsoluteUrl("/edm"),
  },
  title: "EDM",
  twitter: {
    card: "summary_large_image",
    description:
      "Explore EDM articles, DJ interviews, and electronic music features from Arkansas artists on Dead Party Media.",
    images: [ogImage],
    title: `EDM | ${siteName}`,
  },
};

export default function EdmPageWrapper() {
  return <EdmPage />;
}
