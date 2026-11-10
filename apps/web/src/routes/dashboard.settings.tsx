import Page from "@/app/dashboard/settings/page";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/dashboard/settings")({
  validateSearch: (search: Record<string, unknown>): Record<string, string> =>
    Object.fromEntries(
      Object.entries(search)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ),
  component: Page,
});
