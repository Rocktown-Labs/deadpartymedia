import type { Metadata } from "next";
import { getAbsoluteUrl, getSiteDefaults } from "@/lib/seo";
import EventsPage from "./events-page-client";

const { siteUrl, siteName } = getSiteDefaults();
const ogImage = `${siteUrl}/images/dead-party-logo-og.jpg`;

export const metadata: Metadata = {
  alternates: {
    canonical: getAbsoluteUrl("/events"),
  },
  description:
    "Discover upcoming live music events across Arkansas. Concerts, festivals, and shows from artists in every genre — brought to you by Dead Party Media.",
  keywords: [
    "arkansas events",
    "live music arkansas",
    "arkansas concerts",
    "dead party media events",
  ],
  openGraph: {
    description:
      "Discover upcoming live music events across Arkansas. Concerts, festivals, and shows from artists in every genre.",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "Dead Party Media Events" }],
    locale: "en_US",
    siteName,
    title: `Events | ${siteName}`,
    type: "website",
    url: getAbsoluteUrl("/events"),
  },
  title: "Events",
  twitter: {
    card: "summary_large_image",
    description:
      "Discover upcoming live music events across Arkansas. Concerts, festivals, and shows from artists in every genre.",
    images: [ogImage],
    title: `Events | ${siteName}`,
  },
};

export default function EventsPageWrapper() {
  return <EventsPage />;
}
