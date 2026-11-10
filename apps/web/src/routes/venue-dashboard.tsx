import Layout from "@/app/venue-dashboard/layout";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/venue-dashboard")({
  beforeLoad: ({ context }) => {
    const session = context.session;
    if (!session) throw redirect({ to: "/sign-in" });
    if (!session.roles.some((role) => ["super_admin", "venue"].includes(role)))
      throw redirect({ to: "/" });
  },
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});
