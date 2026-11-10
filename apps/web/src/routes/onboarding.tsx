import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: ({ context }) => {
    const session = context.session;
    if (!session) throw redirect({ to: "/sign-in" });
  },
  component: () => <Outlet />,
});
