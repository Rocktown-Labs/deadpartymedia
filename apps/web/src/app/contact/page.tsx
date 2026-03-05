import type { Metadata } from "next";
import { getAbsoluteUrl, getSiteDefaults } from "@/lib/seo";
import ContactPageClient from "./contact-page-client";

const { siteName, siteUrl } = getSiteDefaults();
const ogImage = `${siteUrl}/images/dead-party-logo-og.jpg`;

export const metadata: Metadata = {
  alternates: {
    canonical: getAbsoluteUrl("/contact"),
  },
  description:
    "Contact Dead Party Media for artist submissions, event coverage, story tips, and collaborations.",
  keywords: [
    "contact dead party media",
    "artist submission",
    "arkansas music press contact",
    "event coverage request",
  ],
  openGraph: {
    description:
      "Contact Dead Party Media for artist submissions, event coverage, story tips, and collaborations.",
    images: [{ alt: "Contact Dead Party Media", height: 630, url: ogImage, width: 1200 }],
    locale: "en_US",
    siteName,
    title: `Contact | ${siteName}`,
    type: "website",
    url: getAbsoluteUrl("/contact"),
  },
  title: "Contact",
  twitter: {
    card: "summary_large_image",
    description:
      "Contact Dead Party Media for artist submissions, event coverage, story tips, and collaborations.",
    images: [ogImage],
    title: `Contact | ${siteName}`,
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
