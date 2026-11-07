import { createFileRoute } from "@tanstack/react-router";
import { SignOutButton } from "@clerk/tanstack-react-start";

/**
 * Ported from apps/web/src/app/dashboard/settings (account settings +
 * sign-out; full settings forms arrive with the UI parity pass).
 */
export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings | Dead Party Media" }] }),
});

function SettingsPage() {
  const { userId } = Route.useRouteContext({ select: (c) => c.session });

  return (
    <>
      <h1 className="mb-6 text-3xl font-black">Settings</h1>
      <p className="mb-8 text-gray-400">
        Signed in as <span className="font-mono text-[#7CFC00]">{userId}</span>
      </p>
      <SignOutButton>
        <button
          className="rounded-md border border-red-500/40 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
          type="button"
        >
          Sign out
        </button>
      </SignOutButton>
    </>
  );
}
