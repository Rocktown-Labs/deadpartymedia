import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "../lib/auth.functions";

/**
 * Fan dashboard layout — ported from apps/web/src/app/dashboard/ (the Next
 * layout gates via proxy.ts; here the guard runs in beforeLoad, the proven
 * arts pattern). All /dashboard/* pages render behind it.
 */
export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session.userId) {
      throw redirect({ to: "/sign-in" });
    }
    return { session };
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      <Outlet />
    </main>
  );
}
