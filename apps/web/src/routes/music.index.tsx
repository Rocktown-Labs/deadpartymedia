import Page, { metadata } from "@/app/music/page";
import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/music/")({
  validateSearch: (search: Record<string, unknown>): Record<string, string> =>
    Object.fromEntries(
      Object.entries(search)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ),
  head: () => pageHead(metadata),
  component: Page,
});
