import { SignUp } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

/**
 * Ported from apps/web/src/app/sign-up/[[...rest]]/page.tsx.
 */
export const Route = createFileRoute("/sign-up/")({
  component: SignUpPage,
  head: () => ({
    meta: [{ title: "Sign Up | Dead Party Media" }],
  }),
});

function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <SignUp
        appearance={{
          variables: { colorBackground: "#0A0A0A", colorPrimary: "#7CFC00" },
        }}
        signInUrl="/sign-in"
      />
    </main>
  );
}
