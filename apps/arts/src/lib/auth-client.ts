import { emailOTPClient } from "better-auth/client/plugins";
import { useRouteContext } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({ plugins: [emailOTPClient()] });
export const artsSessionKey = ["arts", "session"] as const;
export function useArtsSession() {
  const { session } = useRouteContext({ from: "__root__" });
  return { session, isPending: false };
}
