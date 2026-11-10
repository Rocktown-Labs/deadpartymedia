import Page from "@/app/sign-in/[[...rest]]/page";
import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/sign-in")({
  beforeLoad: ({ context }) => {
    if (context.session) throw redirect({ to: "/onboarding" });
    throw redirect({ href: "/api/sso/start?view=sign-in", reloadDocument: true });
  },
  component: Page,
});
