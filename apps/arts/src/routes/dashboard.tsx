import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, ImageUp, Settings } from "lucide-react";
import { getCurrentArtmaker, requireUser } from "#/lib/artmakers.functions.ts";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => requireUser(),
  component: Dashboard,
  loader: () => getCurrentArtmaker(),
});

function Dashboard() {
  const artmaker = Route.useLoaderData();

  return (
    <main className="px-5 pt-40 pb-20">
      <div className="mx-auto max-w-6xl">
        <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.28em]">
          Artist dashboard
        </p>
        <h1 className="mt-3 font-black text-5xl tracking-tighter">
          {artmaker ? `Welcome, ${artmaker.name}` : "Set up your arts profile"}
        </h1>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
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
            description="Update contact info, medium tags, Instagram, city, and pronoun visibility."
            href="/onboarding"
            icon={<Settings className="size-5" />}
            label="Edit profile"
            title="Profile settings"
          />
          <div className="border border-neutral-800 bg-[#101010] p-5 opacity-80">
            <div className="grid size-11 place-items-center border border-neutral-700 text-[#7CFC00]">
              <ImageUp className="size-5" />
            </div>
            <h2 className="mt-5 font-black text-xl">Artwork uploads</h2>
            <p className="mt-3 text-neutral-400 text-sm leading-6">
              The `artworks` table is ready. Uploads, gallery management, sale flags, and commission
              flow belong in the next issue.
            </p>
          </div>
        </div>
      </div>
    </main>
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
  href: "/onboarding" | "/artmakers/$slug";
  icon: React.ReactNode;
  label: string;
  params?: { slug: string };
  title: string;
}) {
  return (
    <Link
      to={href}
      params={params}
      className="group border border-neutral-800 bg-[#101010] p-5 text-white no-underline transition-colors hover:border-[#7CFC00]"
    >
      <div className="grid size-11 place-items-center border border-neutral-700 text-[#7CFC00]">
        {icon}
      </div>
      <h2 className="mt-5 font-black text-xl">{title}</h2>
      <p className="mt-3 text-neutral-400 text-sm leading-6">{description}</p>
      <span className="mt-5 inline-flex items-center gap-2 font-black text-[#7CFC00] text-xs uppercase tracking-[0.2em]">
        {label}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
