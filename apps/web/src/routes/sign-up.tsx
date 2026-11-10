import Page from "@/app/sign-up/[[...rest]]/page";
import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/sign-up")({
  beforeLoad: ({ context }) => {
    if (context.session) throw redirect({ to: "/onboarding" });
    throw redirect({ href: "/api/sso/start?view=sign-up", reloadDocument: true });
  },
  component: Page,
});
