import Page, { loadPage, loadPageMetadata } from "@/app/events/[slug]/page";
import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/events/$slug")({
  validateSearch: (search: Record<string, unknown>): Record<string, string> =>
    Object.fromEntries(
      Object.entries(search)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ params, deps }) => ({
    data: await loadPage({ data: { params, search: deps.search } }),
    metadata: await loadPageMetadata({ data: params }),
  }),
  head: ({ loaderData }) => pageHead(loaderData?.metadata),
  component: () => <Page data={Route.useLoaderData().data} />,
});
