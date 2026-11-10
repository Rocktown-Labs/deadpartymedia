import { requireArtsStaff } from "#/lib/artmakers.functions.ts";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireArtsStaff(),
  component: AdminLayout,
});

function AdminLayout() {
  return <Outlet />;
}
