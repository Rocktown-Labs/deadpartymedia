import * as Sentry from "@sentry/tanstackstart-react";
import posthog from "posthog-js";

const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.posthog.com";
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;

if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    ui_host: POSTHOG_HOST,
    // Enables capturing unhandled exceptions via Error Tracking
    capture_exceptions: true,
    // Turn on debug in development mode
    debug: import.meta.env.DEV,
  });
}

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

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
  // https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/
  sendDefaultPii: true,
});
