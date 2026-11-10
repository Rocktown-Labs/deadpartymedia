import Page from "@/app/onboarding/page";
import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/onboarding/")({
  validateSearch: (search: Record<string, unknown>): Record<string, string> =>
    Object.fromEntries(
      Object.entries(search)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ),
  beforeLoad: ({ context, search }) => {
    const session = context.session;
    if (!session) return;
    if (session.roles.some((role) => role === "super_admin" || role === "writer"))
      throw redirect({ to: "/admin" });
    if (session.onboardingComplete) {
      const raw = search.redirect_url || search.redirect;
      const safe =
        raw?.startsWith("/") &&
        !raw.startsWith("//") &&
        !/^\/(onboarding|sign-in|sign-up)(?:\/|$)/.test(raw);
      const destination = safe
        ? raw
        : session.roles.includes("artist")
          ? "/artist-dashboard"
          : session.roles.includes("venue")
            ? "/venues"
            : "/dashboard";
      throw redirect({ to: destination });
    }
  },
  component: Page,
});
