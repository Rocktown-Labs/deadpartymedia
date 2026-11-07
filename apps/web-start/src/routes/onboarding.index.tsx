import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "../lib/auth.functions";

/**
 * Onboarding entry — the multi-step artist/fan/venue forms (Next:
 * apps/web/src/app/onboarding/) are the next porting tranche. The guard and
 * role dispatch land now so authenticated redirects from the dashboards have
 * a faithful target.
 */
export const Route = createFileRoute("/onboarding/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session.userId) {
      throw redirect({ to: "/sign-in" });
    }
    return { session };
  },
  component: OnboardingPage,
  head: () => ({ meta: [{ title: "Onboarding | Dead Party Media" }] }),
});

function OnboardingPage() {
  const { roles } = Route.useRouteContext({ select: (c) => c.session });

  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      <h1 className="mb-2 text-4xl font-black">Welcome to Dead Party Media</h1>
      <p className="mb-8 max-w-2xl text-gray-400">
        Complete your profile to claim your place in the Arkansas music directory. Roles on this
        account: <span className="font-mono text-[#7CFC00]">{roles.join(", ")}</span>
      </p>
      <div className="rounded-md border border-yellow-500/40 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-300">
        The full onboarding wizard (artist / fan / venue steps) is porting in the next tranche — see
        apps/web-start/MIGRATION.md. Until then, manage your profile from the dashboard.
      </div>
      <Link
        className="mt-6 inline-block rounded-md border border-[#7CFC00]/40 px-4 py-2 text-sm text-[#7CFC00] hover:bg-[#7CFC00]/10"
        to="/dashboard"
      >
        Go to dashboard
      </Link>
    </main>
  );
}
