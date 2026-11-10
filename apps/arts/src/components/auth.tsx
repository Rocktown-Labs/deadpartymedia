import { artsSessionKey, authClient, useArtsSession } from "#/lib/auth-client";
import { createArtsClient, readResponse } from "@dpmedia/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Dialog } from "radix-ui";
import { useState, type ReactNode } from "react";

const fieldClass =
  "h-12 w-full rounded-lg border border-gray-700 bg-black px-3 text-white focus:border-[#7CFC00] focus:outline-none";
export function AuthForm({
  mode,
  onComplete,
}: {
  mode: "sign-in" | "sign-up";
  onComplete?: () => void;
}) {
  const navigate = useNavigate();
  const { data: providers } = useQuery({
    queryKey: ["identity", "providers"],
    queryFn: async () => readResponse(await createArtsClient("/api/arts").auth.providers.$get()),
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError("");
        const data = new FormData(event.currentTarget);
        try {
          const email = String(data.get("email") ?? "");
          const password = String(data.get("password") ?? "");
          const result =
            mode === "sign-up"
              ? await authClient.signUp.email({
                  email,
                  password,
                  name: String(data.get("name") ?? ""),
                })
              : await authClient.signIn.email({ email, password });
          if (result.error) throw new Error(result.error.message ?? "Could not sign in");
          await queryClient.invalidateQueries({ queryKey: artsSessionKey });
          await router.invalidate();
          onComplete?.();
          const pathname = window.location.pathname;
          if (
            !pathname.startsWith("/invitation") &&
            (mode === "sign-up" || pathname.startsWith("/sign-"))
          )
            await navigate({ to: "/onboarding" });
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Please try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      {providers?.google ? (
        <button
          type="button"
          className="h-12 w-full rounded-lg border border-gray-700 font-bold text-white hover:border-[#7CFC00]"
          onClick={async () => {
            const callbackURL = window.location.pathname.startsWith("/invitation")
              ? window.location.href
              : `${window.location.origin}/onboarding`;
            const result = await authClient.signIn.social({ provider: "google", callbackURL });
            if (result.error) setError(result.error.message || "Could not sign in with Google");
          }}
        >
          Continue with Google
        </button>
      ) : null}
      {mode === "sign-up" ? (
        <label className="block space-y-2 text-sm">
          Name
          <input name="name" autoComplete="name" required className={fieldClass} />
        </label>
      ) : null}
      <label className="block space-y-2 text-sm">
        Email
        <input name="email" type="email" autoComplete="email" required className={fieldClass} />
      </label>
      <label className="block space-y-2 text-sm">
        Password
        <input
          name="password"
          type="password"
          minLength={mode === "sign-up" ? 8 : undefined}
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          required
          className={fieldClass}
        />
      </label>
      {mode === "sign-in" ? (
        <Link to="/forgot-password" className="block text-sm text-gray-400 hover:text-white">
          Forgot password?
        </Link>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-lg bg-[#7CFC00] font-black text-black disabled:opacity-60"
      >
        {pending ? "Please wait…" : mode === "sign-up" ? "Create account" : "Sign in"}
      </button>
    </form>
  );
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
  const { session } = useArtsSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  return (
    <button
      type="button"
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
