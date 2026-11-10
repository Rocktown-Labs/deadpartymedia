import Page, { loadPage } from "@/app/admin/music/submissions/page";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/admin/music/submissions")({
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
