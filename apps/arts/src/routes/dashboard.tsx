import { requireArtmakerDashboardUser } from "#/lib/artmakers.functions.ts";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => requireArtmakerDashboardUser(),
  component: DashboardLayout,
});

function DashboardLayout() {
  return <Outlet />;
}
