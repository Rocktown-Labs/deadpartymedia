import { requireArtsStaff } from "#/lib/artmakers.functions.ts";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context, location }) => {
    if (!context.session)
      throw redirect({
        href: `/api/sso/start?returnTo=${encodeURIComponent(location.pathname + location.searchStr)}`,
        reloadDocument: true,
      });
    return requireArtsStaff();
  },
  component: AdminLayout,
});

function AdminLayout() {
  return <Outlet />;
}
