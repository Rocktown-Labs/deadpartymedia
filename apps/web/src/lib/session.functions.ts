import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { getMusicApi } from "./api.server";
export const loadMusicSession = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "private, no-store");
  return readResponse(await getMusicApi().session.$get({ query: {} }));
});

export const loadAuthProviders = createServerFn({ method: "GET" }).handler(async () =>
  readResponse(await getMusicApi().auth.providers.$get()),
);
