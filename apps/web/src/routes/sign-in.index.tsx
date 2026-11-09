import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-in/")({
  component: () => (
    <main className="flex min-h-screen items-center justify-center">
      <SignIn signUpUrl="/sign-up" />
    </main>
  ),
  head: () => ({ meta: [{ title: "SignIn | Dead Party Media" }] }),
});
