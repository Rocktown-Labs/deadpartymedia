import { SignUp } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-up/")({
  component: () => (
    <main className="flex min-h-screen items-center justify-center">
      <SignUp signInUrl="/sign-in" />
    </main>
  ),
  head: () => ({ meta: [{ title: "SignUp | Dead Party Media" }] }),
});
