import { authClient } from "@/lib/auth-client";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPassword });
function ForgotPassword() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <main className="mx-auto max-w-md px-6 pt-40 pb-20">
      <h1 className="font-black text-3xl">Reset your password</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          const email = String(new FormData(event.currentTarget).get("email") ?? "");
          try {
            const result = await authClient.requestPasswordReset({
              email,
              redirectTo: `${window.location.origin}/reset-password`,
            });
            if (result.error)
              throw new Error(result.error.message ?? "Could not request a password reset");
            setMessage("If an account exists for that address, a reset link is on its way.");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Please try again.");
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="block space-y-2">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="h-12 w-full rounded-lg border border-gray-700 bg-black px-3"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-lg bg-[#7CFC00] font-bold text-black disabled:opacity-60"
        >
          Send reset link
        </button>
        {message ? (
          <p role="status" className="text-sm text-gray-300">
            {message}
          </p>
        ) : null}
      </form>
    </main>
  );
}
