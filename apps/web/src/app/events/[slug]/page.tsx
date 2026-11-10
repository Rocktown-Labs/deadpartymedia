import { getMusicApi } from "@/lib/api.server";
import { getEvent } from "@/lib/api/server";
import type { PageMetadata as Metadata } from "@/lib/page-head";
import { generateEventMetadata } from "@/lib/seo";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { EventPageClient } from "./event-page-client";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["events"][":slug"].$get({
        param: { slug: input.params.slug },
        query: input.search,
      }),
    ),
  );

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export const generateMetadata = async ({ params }: EventPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) {
    return {
      description: "The event you're looking for could not be found.",
      title: "Event Not Found",
    };
  }

  return generateEventMetadata(event);
};

export default function EventDetailPage({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const { slug } = data;
  return <EventPageClient slug={slug} />;
}

export const loadPageMetadata = createServerFn({ method: "GET" })
  .validator((params: { slug: string }) => params)
  .handler(({ data }) => generateMetadata({ params: Promise.resolve(data) }));
