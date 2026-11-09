import ArticlesPageClient from "@/app/articles/articles-page-client";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/articles/")({
  component: () => <ArticlesPageClient />,
  head: () => ({
    meta: [{ title: "Articles | Dead Party Media" }],
  }),
});
