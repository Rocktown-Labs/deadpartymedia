import { Link, createFileRoute } from "@tanstack/react-router";

/**
 * Admin desk — the Next app's /admin redirects into posts; here the index
 * links the editorial sections (all staff-scoped by the API).
 */
export const Route = createFileRoute("/admin/")({
  component: AdminIndex,
  head: () => ({ meta: [{ title: "Admin | Dead Party Media" }] }),
});

const SECTIONS = [
  { label: "Posts", note: "editorial articles", to: "/admin/posts" },
  { label: "Artists", note: "music directory", to: "/admin/artists" },
  { label: "Events", note: "show listings", to: "/admin/events" },
  { label: "Music", note: "release submissions", to: "/admin/music" },
  { label: "Venues", note: "venue directory", to: "/admin/venues" },
] as const;

function AdminIndex() {
  const { roles } = Route.useRouteContext({ select: (c) => c.session });
  const isSuperAdmin = roles.includes("super_admin");

  return (
    <>
      <h1 className="mb-1 text-4xl font-black">Admin</h1>
      <p className="mb-8 text-sm text-gray-400">
        Signed in with roles: <span className="font-mono text-[#7CFC00]">{roles.join(", ")}</span>
      </p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <li
            className="rounded-md border border-white/10 p-4 hover:border-[#7CFC00]/40"
            key={section.to}
          >
            <Link to={section.to}>
              <h2 className="font-bold">{section.label}</h2>
              <p className="text-sm text-gray-500">{section.note}</p>
            </Link>
          </li>
        ))}
        {isSuperAdmin ? (
          <li className="rounded-md border border-white/10 p-4">
            <h2 className="font-bold">Users</h2>
            <p className="text-sm text-gray-500">
              roles & invitations — screens port with the users tranche
            </p>
          </li>
        ) : null}
      </ul>
      <p className="mt-6 text-xs text-gray-600">
        Editors (create/update/toggle) port with the admin UI parity pass — the full CRUD API
        surface is live.
      </p>
    </>
  );
}
