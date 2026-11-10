import Layout from "@/app/artist-dashboard/layout";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/artist-dashboard")({
  beforeLoad: ({ context }) => {
    const session = context.session;
    if (!session) throw redirect({ to: "/sign-in" });
    if (!session.roles.some((role) => ["super_admin", "artist"].includes(role)))
      throw redirect({ to: "/" });
  },
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});
