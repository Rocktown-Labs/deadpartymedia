import { createFileRoute } from "@tanstack/react-router";
import { ArticlePageClient } from "@/app/article/[slug]/article-page-client";

export const Route = createFileRoute("/article/$slug")({
  component: () => <ArticlePageClient slug={Route.useParams().slug} />,
  head: ({ params }) => ({ meta: [{ title: params.slug + " | Dead Party Media" }] }),
});
