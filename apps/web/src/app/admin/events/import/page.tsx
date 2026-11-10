import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { createEventImportArtistStubAction } from "./actions";
import EventFlyerImportClient from "./event-flyer-import-client";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["admin"]["events"]["import"].$get({ query: input.search }),
    ),
  );

export default function EventFlyerImportPage(_props: {
  data: Awaited<ReturnType<typeof loadPage>>;
}) {
  return <EventFlyerImportClient onCreateArtistStub={createEventImportArtistStubAction} />;
}
