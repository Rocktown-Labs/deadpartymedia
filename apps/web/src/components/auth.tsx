import { authClient, musicSessionKey, useMusicSession } from "@/lib/auth-client";
import { Slot } from "@radix-ui/react-slot";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useHydrated } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up"; onComplete?: () => void }) {
  const search = useLocation({ select: (location) => location.searchStr });
  const parameters = new URLSearchParams(search);
  const requested = parameters.get("redirectTo");
  const returnTo =
    requested?.startsWith("/") && !requested.startsWith("//")
      ? requested
      : typeof window !== "undefined" && window.location.pathname.startsWith("/invitation")
        ? window.location.pathname
        : "/onboarding";
  const target = `/api/sso/start?view=${mode}&returnTo=${encodeURIComponent(returnTo)}`;
  return (
    <a
      className="mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-[#7CFC00] px-5 font-bold text-black"
      href={target}
    >
      Continue to {mode === "sign-up" ? "create account" : "sign in"}
    </a>
  );
}
export function AuthDialog({
  mode,
  children,
}: {
  mode: "sign-in" | "sign-up";
  children: ReactNode;
}) {
  const hydrated = useHydrated();
  return (
    <Slot
      aria-disabled={!hydrated || undefined}
      className={hydrated ? undefined : "pointer-events-none opacity-60"}
      onClick={() => {
        const returnTo =
          mode === "sign-up"
            ? "/onboarding"
            : window.location.pathname + window.location.search + window.location.hash;
        window.location.assign(
          `/api/sso/start?view=${mode}&returnTo=${encodeURIComponent(returnTo)}`,
        );
      }}
    >
      {children}
    </Slot>
  );
}

export function AccountMenu() {
  const hydrated = useHydrated();
  const { session } = useMusicSession();
  const queryClient = useQueryClient();
  return (
    <button
      type="button"
      disabled={!hydrated}
      title={session?.name ? `Sign out ${session.name}` : "Sign out"}
      className="flex h-11 items-center gap-2 rounded-lg border border-gray-800 px-3 text-xs text-white hover:border-[#7CFC00]"
      onClick={async () => {
        await authClient.signOut();
        queryClient.setQueryData(musicSessionKey, null);
        window.location.assign("/");
      }}
    >
      Sign Out
    </button>
  );
}
