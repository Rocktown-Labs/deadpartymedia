import HomepageClient from "@/components/homepage-client";
import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(await getMusicApi().pages["home"].$get({ query: input.search })),
  );

// Data is fetched on the server so the initial HTML contains real content:
// no skeleton swap (CLS), no late LCP image, no client fetch waterfall.
export default function DeadPartyMedia({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const {
    articlesResult,
    eventsArray,
    featuredArticles,
    articlesData,
    featuredProducts,
    transformedMusicReleases,
  } = data;
  return (
    <HomepageClient
      featuredArticles={featuredArticles}
      articlesData={articlesData}
      allEvents={eventsArray}
      musicReleases={transformedMusicReleases}
      featuredProducts={featuredProducts}
      hasArticlesError={articlesResult.status === "rejected"}
      hasProductsError={false}
    />
  );
}
