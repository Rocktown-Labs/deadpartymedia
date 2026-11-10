import Layout from "@/app/dashboard/layout";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ context }) => {
    const session = context.session;
    if (!session) throw redirect({ to: "/sign-in" });
  },
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});
