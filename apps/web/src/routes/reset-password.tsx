import { authClient } from "@/lib/auth-client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search) => ({ token: typeof search.token === "string" ? search.token : "" }),
  component: ResetPassword,
});
function ResetPassword() {
  const { token } = Route.useSearch();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <main className="mx-auto max-w-md px-6 pt-40 pb-20">
      <h1 className="font-black text-3xl">Choose a new password</h1>
      {token ? (
        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            const newPassword = String(new FormData(event.currentTarget).get("password") ?? "");
            try {
              const result = await authClient.resetPassword({ newPassword, token });
              if (result.error)
                throw new Error(result.error.message ?? "Could not reset your password");
              setMessage("Password updated. You can now sign in.");
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Please try again.");
            } finally {
              setPending(false);
            }
          }}
        >
          <label className="block space-y-2">
            New password
            <input
              type="password"
              name="password"
              minLength={8}
              required
              autoComplete="new-password"
              className="h-12 w-full rounded-lg border border-gray-700 bg-black px-3"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="h-12 w-full rounded-lg bg-[#7CFC00] font-bold text-black disabled:opacity-60"
          >
            Update password
          </button>
        </form>
      ) : (
        <p className="mt-6">
          This reset link is incomplete. <Link to="/forgot-password">Request another link.</Link>
        </p>
      )}
      {message ? (
        <p role="status" className="mt-4 text-sm text-gray-300">
          {message}
        </p>
      ) : null}
    </main>
  );
}
