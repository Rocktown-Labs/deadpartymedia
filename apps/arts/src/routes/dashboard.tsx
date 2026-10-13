import { Outlet, createFileRoute } from "@tanstack/react-router";
import { requireArtmakerDashboardUser } from "#/lib/artmakers.functions.ts";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => requireArtmakerDashboardUser(),
  component: DashboardLayout,
});

function DashboardLayout() {
  return <Outlet />;
}
