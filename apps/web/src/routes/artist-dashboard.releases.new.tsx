import Page, { loadPage } from "@/app/artist-dashboard/releases/new/page";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/artist-dashboard/releases/new")({
  validateSearch: (search: Record<string, unknown>): Record<string, string> =>
    Object.fromEntries(
      Object.entries(search)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ params, deps }) => ({
    data: await loadPage({ data: { params, search: deps.search } }),
  }),
  component: () => <Page data={Route.useLoaderData().data} />,
});
