import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { readResponse } from "@dpmedia/api-client";
import { getArtsApi, getArtsSession } from "./api.server";

export const loadArtsSession = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "private, no-store");
  return getArtsSession();
});

export const loadAuthProviders = createServerFn({ method: "GET" }).handler(async () =>
  readResponse(await getArtsApi().auth.providers.$get()),
);
