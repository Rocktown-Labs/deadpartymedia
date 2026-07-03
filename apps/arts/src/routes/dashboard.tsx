import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, CalendarDays, Eye, Images } from "lucide-react";
import { ArtmakerDashboardShell } from "#/components/artmaker-dashboard-shell.tsx";
import { getCurrentArtmaker, requireArtmakerDashboardUser } from "#/lib/artmakers.functions.ts";
import { listCurrentArtworks } from "#/lib/artworks.functions.ts";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => requireArtmakerDashboardUser(),
  component: Dashboard,
  loader: async () => {
    const artmaker = await getCurrentArtmaker();
    const artworks = artmaker ? await listCurrentArtworks() : [];
    return { artmaker, artworks };
  },
});

function Dashboard() {
  const { artmaker, artworks } = Route.useLoaderData();
  const publishedCount = artworks.filter((artwork) => artwork.status === "published").length;

  return (
    <ArtmakerDashboardShell>
      <div className="mb-8">
        <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.28em]">
          Artist dashboard
        </p>
        <h1 className="mt-3 font-black text-4xl tracking-tight">
          {artmaker ? `Welcome, ${artmaker.name}` : "Set up your arts profile"}
        </h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Manage the profile, artwork, events, and future commission tools tied to your public Dead
          Party Arts page.
        </p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Metric
          icon={<Eye className="size-6" />}
          label="Profile Views"
          value={artmaker?.profileViews ?? 0}
        />
        <Metric
          icon={<Images className="size-6" />}
          label="Published Artworks"
          value={publishedCount}
        />
        <Metric icon={<CalendarDays className="size-6" />} label="Events Tagged" value={0} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          description={
            artmaker
              ? "Your public profile is live in the artmaker directory."
              : "Create the profile that powers your public arts page."
          }
          href={artmaker ? "/artmakers/$slug" : "/onboarding"}
          icon={<BadgeCheck className="size-5" />}
          label={artmaker ? "View profile" : "Start onboarding"}
          params={artmaker ? { slug: artmaker.slug } : undefined}
          title={artmaker ? "Profile live" : "Profile needed"}
        />
        <DashboardCard
          description="Add pieces to the exhibitions wall. Use image URLs now; direct upload storage is the next integration."
          href="/dashboard/artworks"
          icon={<Images className="size-5" />}
          label="Manage artwork"
          title="Artwork uploads"
        />
        <DashboardCard
          description="Review events and articles that tag your profile as the arts editorial system fills out."
          href="/dashboard/events"
          icon={<CalendarDays className="size-5" />}
          label="View activity"
          title="Features"
        />
      </div>
    </ArtmakerDashboardShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-[#111111] p-6">
      <div className="mb-4 text-[#7CFC00]">{icon}</div>
      <p className="font-black text-4xl">{value}</p>
      <p className="mt-1 text-gray-400 text-sm">{label}</p>
    </div>
  );
}

function DashboardCard({
  description,
  href,
  icon,
  label,
  params,
  title,
}: {
  description: string;
  href: "/onboarding" | "/artmakers/$slug" | "/dashboard/artworks" | "/dashboard/events";
  icon: React.ReactNode;
  label: string;
  params?: { slug: string };
  title: string;
}) {
  return (
    <Link
      to={href}
      params={params}
      className="group rounded-lg border border-gray-800 bg-[#111111] p-5 text-white no-underline transition-colors hover:border-[#7CFC00]"
    >
      <div className="grid size-11 place-items-center rounded-md border border-neutral-700 text-[#7CFC00]">
        {icon}
      </div>
      <h2 className="mt-5 font-black text-xl">{title}</h2>
      <p className="mt-3 text-gray-400 text-sm leading-6">{description}</p>
      <span className="mt-5 inline-flex items-center gap-2 font-black text-[#7CFC00] text-xs uppercase tracking-[0.2em]">
        {label}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
