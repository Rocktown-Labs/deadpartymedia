import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
const article = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) =>
    readResponse(await getMusicApi().posts[":slug"].$get({ param: { slug }, query: {} })),
  );
const event = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) =>
    readResponse(await getMusicApi().events[":slug"].$get({ param: { slug }, query: {} })),
  );
const artist = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) =>
    readResponse(await getMusicApi().artists[":slug"].$get({ param: { slug }, query: {} })),
  );
const release = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) =>
    readResponse(await getMusicApi().releases[":slug"].$get({ param: { slug }, query: {} })),
  );
export async function getArticle(slug: string) {
  return article({ data: slug }).catch(() => null);
}
export async function getEvent(slug: string) {
  return event({ data: slug }).catch(() => null);
}
export async function getArtist(slug: string) {
  return artist({ data: slug }).catch(() => null);
}
export async function getMusicRelease(slug: string) {
  return release({ data: slug }).catch(() => null);
}
