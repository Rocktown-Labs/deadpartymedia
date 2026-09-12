import type { Metadata } from "next";
import { getAbsoluteUrl, getSiteDefaults } from "@/lib/seo";
import { db } from "@/lib/db";
import { venues } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { VenuesClient } from "./venues-client";

const { siteUrl, siteName } = getSiteDefaults();
const ogImage = `${siteUrl}/images/dead-party-logo-og.jpg`;

export const metadata: Metadata = {
  alternates: {
    canonical: getAbsoluteUrl("/venues"),
  },
  description:
    "Directory of Arkansas music venues, dive bars, stages, and concert halls hosting live local and touring acts.",
  openGraph: {
    description: "Directory of Arkansas music venues, dive bars, stages, and concert halls.",
    images: [{ alt: "Dead Party Media Venues", height: 630, url: ogImage, width: 1200 }],
    locale: "en_US",
    siteName,
    title: `Venues Directory | ${siteName}`,
    type: "website",
    url: getAbsoluteUrl("/venues"),
  },
  title: "Venues Directory",
};

export default async function VenuesPage() {
  let dbVenues: (typeof venues.$inferSelect)[] = [];
  try {
    dbVenues = await db.select().from(venues).orderBy(asc(venues.name));
  } catch {
    dbVenues = [];
  }

  const initialVenues = dbVenues.map((v) => ({
    address: v.address || undefined,
    capacity: v.capacity || undefined,
    city: v.city,
    genres: v.genres || undefined,
    id: String(v.id),
    name: v.name,
    phone: v.phone || undefined,
    website: v.website || undefined,
  }));

  return <VenuesClient initialVenues={initialVenues} />;
}
