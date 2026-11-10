import { Auth } from "#/components/auth/auth";
import { artsSessionKey, authClient, useArtsSession } from "#/lib/auth-client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useHydrated } from "@tanstack/react-router";
import { Dialog } from "radix-ui";
import { useState, type ReactNode } from "react";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up"; onComplete?: () => void }) {
  return <Auth view={mode === "sign-up" ? "signUp" : "signIn"} />;
}
export function AuthDialog({
  mode,
  children,
}: {
  mode: "sign-in" | "sign-up";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/80" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-800 bg-[#0A0A0A] p-7 text-white shadow-2xl">
          <Dialog.Title className="font-black text-2xl">
            {mode === "sign-up" ? "Join Dead Party Arts" : "Welcome back"}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-gray-400">
            Your home for Arkansas art and artists.
          </Dialog.Description>
          <AuthForm mode={mode} onComplete={() => setOpen(false)} />
          <Dialog.Close className="mt-5 w-full text-sm text-gray-400 hover:text-white">
            Close
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function AccountMenu() {
  const hydrated = useHydrated();
  const { session } = useArtsSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={!hydrated}
      title={session?.name ? `Sign out ${session.name}` : "Sign out"}
      className="flex h-11 items-center gap-2 rounded-lg border border-gray-800 px-3 text-xs text-white hover:border-[#7CFC00]"
      onClick={async () => {
        await authClient.signOut();
        queryClient.setQueryData(artsSessionKey, null);
        await router.invalidate();
      }}
    >
      Sign Out
    </button>
  );
}
