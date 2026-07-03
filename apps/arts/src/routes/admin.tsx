import { Outlet, createFileRoute } from "@tanstack/react-router";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireArtsStaff(),
  component: AdminLayout,
});

function AdminLayout() {
  return <Outlet />;
}
