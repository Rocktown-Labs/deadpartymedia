import { readResponse } from "@dpmedia/api-client";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getArtsApi, getArtsSession, withTimestamps } from "./api.server";
import { artmakerOnboardingSchema, fanOnboardingSchema } from "./artmakers";
import { hasArtsStaffRole, shouldRedirectStaffFromArtmakerDashboard } from "./roles";
export {
  getRolesFromMetadata,
  hasArtsStaffRole,
  isArtsStaffRole,
  mergeArtsRole,
  shouldRedirectStaffFromArtmakerDashboard,
} from "./roles";

const slugInputSchema = z.object({
  slug: z.string().min(1),
});

export const requireUser = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getArtsSession();
  if (!session) throw redirect({ to: "/" });
  return { userId: session.userId };
});

export const requireArtmakerDashboardUser = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getArtsSession();
  if (!session) throw redirect({ to: "/" });
  if (shouldRedirectStaffFromArtmakerDashboard(session.roles)) throw redirect({ to: "/admin" });
  return { userId: session.userId, roles: session.roles, role: session.roles[0] ?? null };
});

export const requireArtsStaff = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getArtsSession();
  if (!session) throw redirect({ to: "/" });
  if (!hasArtsStaffRole(session.roles)) throw redirect({ to: "/dashboard" });
  return { userId: session.userId, roles: session.roles, role: session.roles[0] ?? null };
});

export const listArtmakers = createServerFn({ method: "GET" }).handler(async () => {
  return readResponse(await getArtsApi().artmakers.$get());
});

export const getArtmakerBySlug = createServerFn({ method: "GET" })
  .validator(slugInputSchema)
  .handler(async ({ data }) => {
    return readResponse(await getArtsApi().artmakers[":slug"].$get({ param: { slug: data.slug } }));
  });

export const getCurrentArtmaker = createServerFn({ method: "GET" }).handler(async () => {
  const row = await readResponse(await getArtsApi().dashboard.artmaker.$get());
  return row ? withTimestamps(row) : null;
});

export const saveArtmakerOnboarding = createServerFn({ method: "POST" })
  .validator(artmakerOnboardingSchema)
  .handler(async ({ data }) => {
    return readResponse(await getArtsApi().artmakers.onboarding.artmaker.$post({ json: data }));
  });

export const saveFanOnboarding = createServerFn({ method: "POST" })
  .validator(fanOnboardingSchema)
  .handler(async ({ data }) => {
    return readResponse(await getArtsApi().artmakers.onboarding.fan.$post({ json: data }));
  });

export const createArtsArtmakerStub = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(1, "Name is required"),
      city: z.string().optional(),
      image: z.string().optional(),
      instagramUsername: z.string().optional(),
      medium: z.array(z.string()).optional(),
      state: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return readResponse(await getArtsApi().admin.artmakers.$post({ json: data }));
  });

export const updateArtsArtmaker = createServerFn({ method: "POST" })
  .validator(
    z.object({
      bio: z.string().optional(),
      city: z.string().min(1, "City is required"),
      hidden: z.boolean().optional(),
      id: z.number(),
      image: z.string().optional(),
      instagramUsername: z.string().optional(),
      medium: z.array(z.string()).optional(),
      name: z.string().min(1, "Name is required"),
      state: z.string().default("AR"),
      status: z.enum(["draft", "published", "hidden"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    return readResponse(
      await getArtsApi().admin.artmakers[":id"].$patch({
        param: { id: String(data.id) },
        json: data,
      }),
    );
  });

export const toggleArtsArtmakerVisibility = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    return readResponse(
      await getArtsApi().admin.artmakers[":id"].visibility.$post({
        param: { id: String(data.id) },
      }),
    );
  });

export const deleteArtsArtmaker = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    return readResponse(
      await getArtsApi().admin.artmakers[":id"].$delete({ param: { id: String(data.id) } }),
    );
  });

export const recordArtmakerProfileView = createServerFn({ method: "POST" })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    return readResponse(
      await getArtsApi().artmakers[":slug"]["profile-view"].$post({ param: { slug: data.slug } }),
    );
  });
