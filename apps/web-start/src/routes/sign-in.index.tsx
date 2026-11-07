import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

/**
 * Ported from apps/web/src/app/sign-in/[[...rest]]/page.tsx. Clerk v6+
 * components handle their multi-step flow via query params at a single path,
 * so no catch-all is needed.
 */
export const Route = createFileRoute("/sign-in/")({
  component: SignInPage,
  head: () => ({
    meta: [{ title: "Sign In | Dead Party Media" }],
  }),
});

function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <SignIn
        appearance={{
          variables: { colorBackground: "#0A0A0A", colorPrimary: "#7CFC00" },
        }}
        signUpUrl="/sign-up"
      />
    </main>
  );
}
