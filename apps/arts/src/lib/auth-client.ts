import { useRouteContext } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();
export const artsSessionKey = ["arts", "session"] as const;
export function useArtsSession() {
  const { session } = useRouteContext({ from: "__root__" });
  return { session, isPending: false };
}
