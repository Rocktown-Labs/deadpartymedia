import { AuthForm } from "@/components/auth";
import { musicSessionKey, useMusicSession } from "@/lib/auth-client";
import { createMusicClient, readResponse } from "@dpmedia/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/invitation/$token")({ component: AcceptInvitation });
function AcceptInvitation() {
  const { token } = Route.useParams();
  const router = useRouter();
  const { session } = useMusicSession();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-up");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <main className="mx-auto max-w-md px-6 pt-40 pb-20">
      <h1 className="font-black text-3xl">You’re invited</h1>
      {session ? (
        <>
          <p className="mt-4 text-gray-400">Accept this invitation for {session.email}.</p>
          <button
            type="button"
            disabled={pending}
            className="mt-6 h-12 w-full rounded-lg bg-[#7CFC00] font-bold text-black disabled:opacity-60"
            onClick={async () => {
              setPending(true);
              try {
                await readResponse(
                  createMusicClient("/api/rpc/music").invitations.accept.$post({ json: { token } }),
                );
                await queryClient.invalidateQueries({ queryKey: musicSessionKey });
                await router.invalidate();
                setMessage("Invitation accepted. Your account now has access.");
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Could not accept invitation");
              } finally {
                setPending(false);
              }
            }}
          >
            Accept invitation
          </button>
        </>
      ) : (
        <>
          <AuthForm mode={mode} />
          <button
            type="button"
            className="mt-5 text-sm text-gray-400"
            onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}
          >
            {mode === "sign-up" ? "Already have an account? Sign in" : "Create an account"}
          </button>
        </>
      )}
      {message ? (
        <p role="status" className="mt-4 text-sm text-gray-300">
          {message}
        </p>
      ) : null}
    </main>
  );
}
