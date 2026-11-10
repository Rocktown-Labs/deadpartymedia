import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/sign-in")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: `/auth/sign-in${location.searchStr}`, reloadDocument: true });
  },
});
