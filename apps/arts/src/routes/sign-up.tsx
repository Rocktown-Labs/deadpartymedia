import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/sign-up")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: `/auth/sign-up${location.searchStr}`, reloadDocument: true });
  },
});
