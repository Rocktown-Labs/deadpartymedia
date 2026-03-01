import posthog from "posthog-js";
import * as Sentry from "@sentry/nextjs";

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: POSTHOG_HOST,
  ui_host: POSTHOG_HOST,
  // Enables capturing unhandled exceptions via Error Tracking
  capture_exceptions: true,
  // Turn on debug in development mode
  debug: process.env.NODE_ENV === "development",
});

//IMPORTANT: Never combine this approach with other client-side PostHog initialization approaches, especially components like a PostHogProvider. instrumentation-client.ts is the correct solution for initializating client-side PostHog in Next.js 15.3+ apps.
Sentry.init({
  dsn: "https://98df3fb2ffbb5ff975ba90d4f21053e1@o4510278858309632.ingest.us.sentry.io/4510700130271232",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
