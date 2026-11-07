import { createFileRoute } from "@tanstack/react-router";

/**
 * Admin section index — the Next app's /admin redirects into posts; here
 * the index lists the editorial sections. The 24 CRUD pages (tables,
 * editors, imports) are the remaining UI-parity-scale work, tracked in
 * MIGRATION.md.
 */
export const Route = createFileRoute("/admin/")({
  component: AdminIndex,
  head: () => ({ meta: [{ title: "Admin | Dead Party Media" }] }),
});

function AdminIndex() {
  const { roles } = Route.useRouteContext({ select: (c) => c.session });
  const isSuperAdmin = roles.includes("super_admin");

  const sections = [
    { label: "Posts", note: "editorial articles" },
    { label: "Artists", note: "music directory" },
    { label: "Events", note: "show listings" },
    { label: "Music", note: "release submissions" },
    { label: "Venues", note: "venue directory" },
    ...(isSuperAdmin ? [{ label: "Users", note: "roles & invitations" }] : []),
  ];

  return (
    <>
      <h1 className="mb-1 text-4xl font-black">Admin</h1>
      <p className="mb-8 text-sm text-gray-400">
        Signed in with roles: <span className="font-mono text-[#7CFC00]">{roles.join(", ")}</span>
      </p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <li className="rounded-md border border-white/10 p-4" key={section.label}>
            <h2 className="font-bold">{section.label}</h2>
            <p className="text-sm text-gray-500">{section.note}</p>
            <p className="mt-2 text-xs text-gray-600">
              CRUD screens port with the admin UI parity pass
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
