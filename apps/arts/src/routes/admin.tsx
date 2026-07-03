import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Newspaper, UsersRound } from "lucide-react";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireArtsStaff(),
  component: ArtsAdmin,
});

function ArtsAdmin() {
  const staff = Route.useRouteContext();

  return (
    <main className="px-5 pt-40 pb-20">
      <div className="mx-auto max-w-6xl">
        <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.28em]">Arts admin</p>
        <h1 className="mt-3 font-black text-5xl tracking-tighter">Arts command desk</h1>
        <p className="mt-4 max-w-2xl text-neutral-400 leading-7">
          Staff role: {staff.role}. This is the staging surface for artmaker moderation, arts posts,
          events, and future artwork submissions.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <AdminPanel
            description="Review sheet imports, claimed profiles, public visibility, and contact status."
            icon={<UsersRound className="size-5" />}
            title="Artmakers"
          />
          <AdminPanel
            description="Arts editorial can share the same posts table with vertical set to arts."
            icon={<Newspaper className="size-5" />}
            title="Posts"
          />
          <AdminPanel
            description="Arts events can share the events table and tag artmakers through event_artmakers."
            icon={<ClipboardList className="size-5" />}
            title="Events"
          />
        </div>

        <Link
          to="/artmakers"
          className="mt-8 inline-flex font-black text-[#7CFC00] text-xs uppercase tracking-[0.22em] no-underline"
        >
          View public directory
        </Link>
      </div>
    </main>
  );
}

function AdminPanel({
  description,
  icon,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="border border-neutral-800 bg-[#101010] p-5">
      <div className="grid size-11 place-items-center border border-neutral-700 text-[#7CFC00]">
        {icon}
      </div>
      <h2 className="mt-5 font-black text-xl">{title}</h2>
      <p className="mt-3 text-neutral-400 text-sm leading-6">{description}</p>
    </div>
  );
}
