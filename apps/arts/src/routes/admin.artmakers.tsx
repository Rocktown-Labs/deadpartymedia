import { createFileRoute, Link } from "@tanstack/react-router";
import { ArtsAdminShell } from "#/components/arts-admin-shell.tsx";
import { listAdminArtmakers } from "#/lib/admin.functions.ts";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";

export const Route = createFileRoute("/admin/artmakers")({
  beforeLoad: () => requireArtsStaff(),
  component: AdminArtmakers,
  loader: () => listAdminArtmakers(),
});

function AdminArtmakers() {
  const staff = Route.useRouteContext();
  const artmakers = Route.useLoaderData();

  return (
    <ArtsAdminShell role={staff.role}>
      <PageIntro
        title="Artmakers"
        description="Review imported sheet rows, claimed profiles, visibility, city, Instagram, and medium coverage."
      />
      <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-[#0A0A0A] text-gray-300 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">City</th>
                <th className="px-6 py-4">Instagram</th>
                <th className="px-6 py-4">Medium</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {artmakers.map((artmaker) => (
                <tr key={artmaker.id} className="border-gray-800 border-t hover:bg-gray-900">
                  <td className="px-6 py-4">
                    <Link
                      to="/artmakers/$slug"
                      params={{ slug: artmaker.slug }}
                      className="font-bold text-white no-underline hover:text-[#7CFC00]"
                    >
                      {artmaker.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {artmaker.city}, {artmaker.state}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">@{artmaker.instagramUsername}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {artmaker.medium.slice(0, 3).join(", ")}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={artmaker.hidden ? "hidden" : artmaker.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ArtsAdminShell>
  );
}

function PageIntro({ description, title }: { description: string; title: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-black text-4xl tracking-tight">{title}</h1>
      <p className="mt-3 max-w-2xl text-gray-400">{description}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="rounded bg-[#7CFC00]/15 px-2 py-1 font-bold text-[#7CFC00] text-xs uppercase">
      {status}
    </span>
  );
}
