import { createFileRoute } from "@tanstack/react-router";
import { ArtsAdminShell } from "#/components/arts-admin-shell.tsx";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";
import { listArtsArticles } from "#/lib/content.functions.ts";

export const Route = createFileRoute("/admin/articles")({
  beforeLoad: () => requireArtsStaff(),
  component: AdminArticles,
  loader: () => listArtsArticles(),
});

function AdminArticles() {
  const staff = Route.useRouteContext();
  const articles = Route.useLoaderData();

  return (
    <ArtsAdminShell role={staff.role}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-black text-4xl tracking-tight">Articles</h1>
          <p className="mt-3 max-w-2xl text-gray-400">
            Arts editorial shares the posts table with the arts vertical. Composer parity with web
            is the next route-level port.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-gray-800 px-4 py-3 font-black text-gray-500 text-xs uppercase tracking-[0.18em]"
          disabled
        >
          Composer next
        </button>
      </div>

      <ListPanel
        empty="No arts articles are published yet."
        rows={articles.map((article) => ({
          meta: article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "Draft",
          title: article.title,
        }))}
      />
    </ArtsAdminShell>
  );
}

function ListPanel({ empty, rows }: { empty: string; rows: { meta: string; title: string }[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]">
      {rows.length > 0 ? (
        rows.map((row) => (
          <div key={row.title} className="border-gray-800 border-b p-5 last:border-b-0">
            <h2 className="font-bold text-lg">{row.title}</h2>
            <p className="mt-1 text-gray-500 text-sm">{row.meta}</p>
          </div>
        ))
      ) : (
        <p className="p-6 text-gray-400">{empty}</p>
      )}
    </div>
  );
}
