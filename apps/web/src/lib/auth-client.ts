import { useRouteContext } from "@tanstack/react-router";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({ plugins: [emailOTPClient()] });
export const musicSessionKey = ["music", "session"] as const;
export function useMusicSession() {
  const { session } = useRouteContext({ from: "__root__" });
  return { session, isPending: false };
}
