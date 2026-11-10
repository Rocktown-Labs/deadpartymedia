import { createArtsClient, readResponse } from "@dpmedia/api-client";
import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";

export const getArtsApi = createServerOnlyFn(() =>
  createArtsClient("https://deadparty-api/arts", {
    headers: Object.fromEntries(getRequestHeaders().entries()),
    fetch: (input: RequestInfo | URL, init?: RequestInit) => env.API.fetch(input, init),
  }),
);
export const getArtsSession = createServerOnlyFn(async () =>
  readResponse(await getArtsApi().session.$get()),
);

export function withCreatedAt<T extends { createdAt: string }>(row: T) {
  const { createdAt, ...fields } = row;
  return { ...fields, createdAt: new Date(createdAt) };
}
export function withTimestamps<T extends { createdAt: string; updatedAt: string }>(row: T) {
  const { createdAt, updatedAt, ...fields } = row;
  return { ...fields, createdAt: new Date(createdAt), updatedAt: new Date(updatedAt) };
}
export function withArticleDates<T extends { createdAt: string; publishedAt: string | null }>(
  row: T,
) {
  const { createdAt, publishedAt, ...fields } = row;
  return {
    ...fields,
    createdAt: new Date(createdAt),
    publishedAt: publishedAt ? new Date(publishedAt) : null,
  };
}
export const listAllArtworks = createServerOnlyFn(async (medium?: string) => {
  const api = getArtsApi();
  let page = await readResponse(
    await api.artworks.$get({ query: { medium, limit: "60", offset: "0", sort: "recent" } }),
  );
  const items = [...page.items];
  while (page.nextOffset !== null) {
    page = await readResponse(
      await api.artworks.$get({
        query: { medium, limit: "60", offset: String(page.nextOffset), sort: "recent" },
      }),
    );
    items.push(...page.items);
  }
  return items.map((row) => withCreatedAt(row));
});
