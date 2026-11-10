import Page from "@/app/onboarding/page";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/onboarding/")({
  validateSearch: (search: Record<string, unknown>): Record<string, string> =>
    Object.fromEntries(
      Object.entries(search)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ),
  component: Page,
});
