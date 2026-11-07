import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "../lib/auth.functions";

/**
 * Admin layout — ported from apps/web/src/app/admin/layout.tsx, whose gate
 * is `auth() + checkRole("super_admin" | "writer")`. The guard runs in
 * beforeLoad here; staff land on the section index, others on /dashboard.
 */
export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session.userId) {
      throw redirect({ to: "/sign-in" });
    }
    if (!session.roles.some((role) => role === "super_admin" || role === "writer")) {
      throw redirect({ to: "/dashboard" });
    }
    return { session };
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <main className="mx-auto max-w-6xl px-6 pt-24 pb-20">
      <Outlet />
    </main>
  );
}
