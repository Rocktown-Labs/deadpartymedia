import { getMusicApi } from "@/lib/api.server";
import { getMusicRelease } from "@/lib/api/server";
import type { PageMetadata as Metadata } from "@/lib/page-head";
import { getAbsoluteUrl, getSiteDefaults } from "@/lib/seo";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { MusicReleaseClient } from "./music-release-client";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["music"][":slug"].$get({
        param: { slug: input.params.slug },
        query: input.search,
      }),
    ),
  );

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

export default function MusicReleasePage({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const { slug } = data;
  return <MusicReleaseClient slug={slug} />;
}

export const loadPageMetadata = createServerFn({ method: "GET" })
  .validator((params: { slug: string }) => params)
  .handler(({ data }) => generateMetadata({ params: Promise.resolve(data) }));
