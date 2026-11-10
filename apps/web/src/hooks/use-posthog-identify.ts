import { useMusicSession } from "@/lib/auth-client";
import posthog from "posthog-js";
import { useEffect } from "react";
export function usePostHogIdentify() {
  const { session } = useMusicSession();
  useEffect(() => {
    if (!import.meta.env.VITE_POSTHOG_KEY) return;
    if (session)
      posthog.identify(session.userId, {
        email: session.email,
        name: session.name,
        role: session.roles[0],
      });
    else posthog.reset();
  }, [session]);
}
export function resetPostHogIdentification() {
  posthog.reset();
}
