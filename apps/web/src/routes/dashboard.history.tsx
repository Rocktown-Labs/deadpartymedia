import Page from "@/app/dashboard/history/page";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/dashboard/history")({
  validateSearch: (search: Record<string, unknown>): Record<string, string> =>
    Object.fromEntries(
      Object.entries(search)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ),
  component: Page,
});
