import { useRouteContext } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();
export const musicSessionKey = ["music", "session"] as const;
export function useMusicSession() {
  const { session } = useRouteContext({ from: "__root__" });
  return { session, isPending: false };
}
