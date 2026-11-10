import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getArtsApi, withCreatedAt } from "./api.server";
export { isArtsAdminRole } from "./roles";

export const getArtsAdminOverview = createServerFn({ method: "GET" }).handler(async () => {
  const result = await readResponse(await getArtsApi().admin.overview.$get());
  return {
    ...result,
    error: "error" in result ? result.error : undefined,
    recentArticles: result.recentArticles.map((row) => withCreatedAt(row)),
    recentArtmakers: result.recentArtmakers.map((row) => withCreatedAt(row)),
    recentArtworks: result.recentArtworks.map((row) => withCreatedAt(row)),
    recentEvents: result.recentEvents.map((row) => withCreatedAt(row)),
  };
});

export const listAdminArtmakers = createServerFn({ method: "GET" }).handler(async () => {
  return (await readResponse(await getArtsApi().admin.artmakers.$get())).map((row) =>
    withCreatedAt(row),
  );
});

export const listArtsStaffUsers = createServerFn({ method: "GET" }).handler(async () => {
  return (await readResponse(await getArtsApi().admin.users.$get())).map((row) => ({
    ...row,
    updatedAt: new Date(row.updatedAt),
  }));
});

export const updateArtsUserRole = createServerFn({ method: "POST" })
  .validator(
    z.object({
      role: z.enum(["artmaker", "arts_admin", "arts_writer", "fan", "super_admin"]),
      userId: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    return readResponse(
      await getArtsApi().admin.users[":id"].role.$post({
        param: { id: String(data.userId) },
        json: data,
      }),
    );
  });

export const inviteArtsUser = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email("Valid email is required"),
      role: z.enum(["arts_admin", "arts_writer", "artmaker", "fan"]),
    }),
  )
  .handler(async ({ data }) => {
    return readResponse(await getArtsApi().admin.invitations.$post({ json: data }));
  });

export const listArtsInvitations = createServerFn({ method: "GET" }).handler(async () => {
  return readResponse(await getArtsApi().admin.invitations.$get());
});
