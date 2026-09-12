import type { Metadata } from "next";
import { getMusicRelease } from "@/lib/api/server";
import { getAbsoluteUrl, getSiteDefaults } from "@/lib/seo";
import { MusicReleaseClient } from "./music-release-client";

interface MusicReleasePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const generateMetadata = async ({ params }: MusicReleasePageProps): Promise<Metadata> => {
  const { slug } = await params;
  const release = await getMusicRelease(slug);
  const { siteUrl, siteName } = getSiteDefaults();

  if (!release) {
    return {
      description: "The music release you're looking for could not be found.",
      title: "Music Release Not Found",
    };
  }

  const ogImage = release.coverArt || `${siteUrl}/images/dead-party-logo-og.jpg`;

  return {
    alternates: {
      canonical: getAbsoluteUrl(`/music/${release.slug}`),
    },
    description: release.excerpt,
    openGraph: {
      description: release.excerpt,
      images: [{ alt: release.title, height: 630, url: ogImage, width: 1200 }],
      siteName,
      title: `${release.title} by ${release.artistName} | ${siteName}`,
      type: "music.album",
      url: getAbsoluteUrl(`/music/${release.slug}`),
    },
    title: `${release.title} by ${release.artistName}`,
    twitter: {
      card: "summary_large_image",
      description: release.excerpt,
      images: [ogImage],
      title: `${release.title} by ${release.artistName} | ${siteName}`,
    },
  };
};

export default async function MusicReleasePage({ params }: MusicReleasePageProps) {
  const { slug } = await params;
  return <MusicReleaseClient slug={slug} />;
}
