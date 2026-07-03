import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Images, Newspaper, UsersRound } from "lucide-react";
import { ArtsAdminShell } from "#/components/arts-admin-shell.tsx";
import { getArtsAdminOverview } from "#/lib/admin.functions.ts";

export const Route = createFileRoute("/admin/")({
  component: ArtsAdmin,
  loader: () => getArtsAdminOverview(),
});

function ArtsAdmin() {
  const staff = Route.useRouteContext();
  const overview = Route.useLoaderData();

  return (
    <ArtsAdminShell role={staff.role}>
      <div className="mb-8">
        <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.28em]">
          Arts command desk
        </p>
        <h1 className="mt-3 font-black text-4xl tracking-tight">Dashboard</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Manage the arts vertical: artmakers, exhibitions, articles, events, and the upload queue
          that will grow into commissions and commerce.
        </p>
      </div>

      {overview.isDegraded ? (
        <div className="mb-8 rounded-lg border border-yellow-500/40 bg-yellow-950/20 p-4 text-yellow-100">
          <p className="font-black text-sm uppercase tracking-[0.2em]">Database needs attention</p>
          <p className="mt-2 text-sm leading-6">
            The arts admin shell loaded, but one or more arts tables could not be queried. Run the
            arts database migration/push against the production database, then refresh.
          </p>
          {overview.error ? (
            <p className="mt-2 text-yellow-200/80 text-xs">{overview.error}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<UsersRound className="size-6" />}
          label="Published Artmakers"
          value={overview.counts.artmakers}
        />
        <StatCard
          icon={<Images className="size-6" />}
          label="Published Artworks"
          value={overview.counts.artworks}
        />
        <StatCard
          icon={<Newspaper className="size-6" />}
          label="Published Articles"
          value={overview.counts.articles}
        />
        <StatCard
          icon={<CalendarDays className="size-6" />}
          label="Published Events"
          value={overview.counts.events}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RecentPanel
          title="Recent Artmakers"
          items={overview.recentArtmakers.map((item) => ({
            href: "/admin/artmakers" as const,
            meta: `${item.status} - ${new Date(item.createdAt).toLocaleDateString()}`,
            title: item.name,
          }))}
        />
        <RecentPanel
          title="Recent Artworks"
          items={overview.recentArtworks.map((item) => ({
            href: "/admin/exhibitions" as const,
            meta: `${item.artmakerName} - ${item.status}`,
            title: item.title,
          }))}
        />
        <RecentPanel
          title="Recent Articles"
          items={overview.recentArticles.map((item) => ({
            href: "/admin/articles" as const,
            meta: `${item.status} - ${new Date(item.createdAt).toLocaleDateString()}`,
            title: item.title,
          }))}
        />
        <RecentPanel
          title="Recent Events"
          items={overview.recentEvents.map((item) => ({
            href: "/admin/events" as const,
            meta: `${item.status} - ${new Date(item.createdAt).toLocaleDateString()}`,
            title: item.title,
          }))}
        />
      </div>
    </ArtsAdminShell>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-[#111111] p-6">
      <div className="mb-4 text-[#7CFC00]">{icon}</div>
      <p className="font-black text-4xl">{value}</p>
      <p className="mt-1 text-gray-400 text-sm">{label}</p>
    </div>
  );
}

function RecentPanel({
  items,
  title,
}: {
  items: {
    href: "/admin/artmakers" | "/admin/exhibitions" | "/admin/articles" | "/admin/events";
    meta: string;
    title: string;
  }[];
  title: string;
}) {
  return (
    <section className="rounded-lg border border-gray-800 bg-[#111111] p-6">
      <h2 className="mb-4 font-black text-xl">{title}</h2>
      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <Link
              key={`${item.title}-${item.meta}`}
              to={item.href}
              className="block border-gray-800 border-b pb-3 text-white no-underline last:border-b-0 last:pb-0 hover:text-[#7CFC00]"
            >
              <p className="font-bold">{item.title}</p>
              <p className="mt-1 text-gray-500 text-sm">{item.meta}</p>
            </Link>
          ))
        ) : (
          <p className="text-gray-400">Nothing here yet.</p>
        )}
      </div>
    </section>
  );
}
