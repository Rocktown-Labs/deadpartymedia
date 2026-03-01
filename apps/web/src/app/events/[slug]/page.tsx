import type { Metadata } from "next";
import { getEvent } from "@/lib/api/server";
import { generateEventMetadata } from "@/lib/seo";
import { EventPageClient } from "./event-page-client";

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) {
    return {
      description: "The event you're looking for could not be found.",
      title: "Event Not Found | Dead Party Media",
    };
  }

  return generateEventMetadata(event);
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { slug } = await params;
  return <EventPageClient slug={slug} />;
}
