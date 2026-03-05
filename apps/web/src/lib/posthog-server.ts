import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

export function getPostHogClient() {
  if (!posthogClient) {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!posthogKey) {
      throw new Error("NEXT_PUBLIC_POSTHOG_KEY is required to initialize PostHog");
    }

    posthogClient = new PostHog(posthogKey, {
      flushAt: 1,
      flushInterval: 0,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    });
  }
  return posthogClient;
}

export async function shutdownPostHog() {
  if (posthogClient) {
    await posthogClient.shutdown();
  }
}
