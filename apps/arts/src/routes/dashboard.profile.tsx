import { createFileRoute, Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { ArtmakerDashboardShell } from "#/components/artmaker-dashboard-shell.tsx";
import { getCurrentArtmaker, requireArtmakerDashboardUser } from "#/lib/artmakers.functions.ts";

export const Route = createFileRoute("/dashboard/profile")({
  beforeLoad: () => requireArtmakerDashboardUser(),
  component: DashboardProfile,
  loader: () => getCurrentArtmaker(),
});

function DashboardProfile() {
  const artmaker = Route.useLoaderData();

  return (
    <ArtmakerDashboardShell>
      <div className="mb-8">
        <h1 className="font-black text-4xl tracking-tight">Profile</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Your onboarding form is the profile editor for now. The full inline profile editor can
          port from the web artist dashboard next.
        </p>
      </div>

      <div className="rounded-lg border border-gray-800 bg-[#111111] p-6">
        <div className="grid size-11 place-items-center rounded-md border border-[#7CFC00]/40 text-[#7CFC00]">
          <Settings className="size-5" />
        </div>
        <h2 className="mt-5 font-black text-2xl">{artmaker?.name ?? "Profile setup"}</h2>
        <p className="mt-3 text-gray-400">
          Update name, city, pronouns, phone, Instagram, bio, and medium tags.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/onboarding"
            className="rounded-lg border border-[#7CFC00] bg-[#7CFC00] px-4 py-3 font-black text-black text-xs uppercase tracking-[0.18em] no-underline"
          >
            Edit profile
          </Link>
          {artmaker ? (
            <Link
              to="/artmakers/$slug"
              params={{ slug: artmaker.slug }}
              className="rounded-lg border border-gray-800 px-4 py-3 font-black text-white text-xs uppercase tracking-[0.18em] no-underline hover:border-[#7CFC00] hover:text-[#7CFC00]"
            >
              View public profile
            </Link>
          ) : null}
        </div>
      </div>
    </ArtmakerDashboardShell>
  );
}
