import { viewPaths } from "@better-auth-ui/core";
import { useLocation } from "@tanstack/react-router";
import { Dialog } from "radix-ui";
import { Auth } from "#/components/auth/auth";
import { emailOtpPlugin } from "#/lib/auth/email-otp-plugin";

const paths = new Set(Object.values({ ...viewPaths.auth, ...emailOtpPlugin().viewPaths?.auth }));
export function ArtsAuthModal() {
  const location = useLocation();
  const query = new URLSearchParams(location.searchStr);
  const path = query.get("auth") || "";
  const flow = query.get("redirectTo") || "";
  if (
    location.pathname.startsWith("/auth/") ||
    !paths.has(path) ||
    !/^\/api\/sso\/establish\?state=[a-f0-9-]{72}$/.test(flow)
  )
    return null;
  const close = () => {
    const target = new URL(query.get("backTo") || "/", window.location.origin);
    window.location.assign(target.origin === window.location.origin ? target.href : "/");
  };
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[101] max-h-[85dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-gray-800 bg-[#0A0A0A] p-6 text-white shadow-2xl [--primary:#7CFC00] [--primary-foreground:#000] [--ring:#7CFC00]">
          <Dialog.Title className="sr-only">Dead Party Arts account</Dialog.Title>
          <Dialog.Description className="sr-only">
            Sign in or create your Dead Party Arts account.
          </Dialog.Description>
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={close}
              className="text-sm text-[#7CFC00] hover:underline"
            >
              ← Back to Dead Party Arts
            </button>
            <Dialog.Close
              aria-label="Close sign-in"
              className="rounded p-1 text-xl text-gray-400 hover:text-white"
            >
              ×
            </Dialog.Close>
          </div>
          <img
            src="/deadpartyarts-trans.png"
            alt="Dead Party Arts"
            className="mx-auto mb-5 h-20 w-auto"
          />
          <Auth
            path={path}
            className="mx-auto w-full max-w-none border-0 bg-transparent shadow-none"
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
