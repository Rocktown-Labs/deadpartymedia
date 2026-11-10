import Layout from "@/app/admin/layout";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context }) => {
    const session = context.session;
    if (!session) throw redirect({ to: "/sign-in" });
    if (!session.roles.some((role) => ["super_admin", "writer"].includes(role)))
      throw redirect({ to: "/" });
  },
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});
