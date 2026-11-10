import { getMusicApi } from "@/lib/api.server";
import { getArtist } from "@/lib/api/server";
import type { PageMetadata as Metadata } from "@/lib/page-head";
import { generateArtistMetadata } from "@/lib/seo";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { ArtistPageClient } from "./artist-page-client";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["artists"][":slug"].$get({
        param: { slug: input.params.slug },
        query: input.search,
      }),
    ),
  );

interface ArtistPageProps {
  params: Promise<{ slug: string }>;
}

export const generateMetadata = async ({ params }: ArtistPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const artist = await getArtist(slug);

  if (!artist) {
    return {
      description: "The artist you're looking for could not be found.",
      title: "Artist Not Found",
    };
  }

  return generateArtistMetadata(artist);
};

export default function ArtistDetailPage({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const { slug } = data;
  return <ArtistPageClient slug={slug} />;
}

export const loadPageMetadata = createServerFn({ method: "GET" })
  .validator((params: { slug: string }) => params)
  .handler(({ data }) => generateMetadata({ params: Promise.resolve(data) }));
