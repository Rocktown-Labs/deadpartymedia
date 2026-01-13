import type { Metadata } from "next";
import { getArtist } from "@/lib/api/server";
import { generateArtistMetadata } from "@/lib/seo";
import { ArtistPageClient } from "./artist-page-client";

interface ArtistPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ArtistPageProps): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtist(slug);

  if (!artist) {
    return {
      title: "Artist Not Found | Dead Party Media",
      description: "The artist you're looking for could not be found.",
    };
  }

  return generateArtistMetadata(artist);
}

export default async function ArtistDetailPage({ params }: ArtistPageProps) {
  const { slug } = await params;
  return <ArtistPageClient slug={slug} />;
}
