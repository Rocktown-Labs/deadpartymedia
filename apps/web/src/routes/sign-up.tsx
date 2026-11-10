import Page from "@/app/sign-up/[[...rest]]/page";
import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/sign-up")({
  beforeLoad: ({ context }) => {
    if (context.session) throw redirect({ to: "/onboarding" });
  },
  component: Page,
});
