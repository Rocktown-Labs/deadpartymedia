import type { Metadata } from "next";
import { getAbsoluteUrl, getSiteDefaults } from "@/lib/seo";
import ArticlesPage from "./articles-page-client";

const { siteUrl, siteName } = getSiteDefaults();
const ogImage = `${siteUrl}/images/dead-party-logo-og.jpg`;

export const metadata: Metadata = {
  alternates: {
    canonical: getAbsoluteUrl("/articles"),
  },
  description:
    "Read the latest articles covering Arkansas music across all genres including country, EDM, hip-hop, R&B, hardcore, rock, and more.",
  keywords: ["arkansas music articles", "music stories", "arkansas artists", "dead party media"],
  openGraph: {
    description:
      "Read the latest articles covering Arkansas music across all genres including country, EDM, hip-hop, R&B, hardcore, rock, and more.",
    images: [{ alt: "Dead Party Media Articles", height: 630, url: ogImage, width: 1200 }],
    locale: "en_US",
    siteName,
    title: `Articles | ${siteName}`,
    type: "website",
    url: getAbsoluteUrl("/articles"),
  },
  title: "Articles",
  twitter: {
    card: "summary_large_image",
    description:
      "Read the latest articles covering Arkansas music across all genres including country, EDM, hip-hop, R&B, hardcore, rock, and more.",
    images: [ogImage],
    title: `Articles | ${siteName}`,
  },
};

export default function ArticlesPageWrapper() {
  return <ArticlesPage />;
}
