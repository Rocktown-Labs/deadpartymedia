import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "../lib/auth.functions";

/**
 * First authenticated route — the guard pattern for everything that follows
 * (dashboards, admin): beforeLoad checks the session server-side and
 * redirects anonymous visitors to sign-in, exactly like apps/arts'
 * requireUser guards.
 */
export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session.userId) {
      throw redirect({ to: "/sign-in" });
    }
    return { userId: session.userId };
  },
  component: DashboardPage,
  head: () => ({
    meta: [{ title: "Dashboard | Dead Party Media" }],
  }),
});

function DashboardPage() {
  const { userId } = Route.useRouteContext();

  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      <h1 className="mb-2 text-4xl font-black">Dashboard</h1>
      <p className="text-sm text-gray-400">
        Signed in as <span className="font-mono text-[#7CFC00]">{userId}</span>
      </p>
      <p className="mt-6 text-gray-500">
        The full fan dashboard (history, saved, comments, settings) migrates in the next tranche —
        see MIGRATION.md.
      </p>
    </main>
  );
}
