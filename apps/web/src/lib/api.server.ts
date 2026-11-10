import { createMusicClient } from "@dpmedia/api-client";
import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
export const getMusicApi = createServerOnlyFn(() =>
  createMusicClient("https://deadparty-api/music", {
    headers: Object.fromEntries(getRequestHeaders().entries()),
    fetch: (input: RequestInfo | URL, init?: RequestInit) => env.API.fetch(input, init),
  }),
);
