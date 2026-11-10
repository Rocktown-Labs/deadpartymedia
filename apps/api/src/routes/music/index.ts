import { Hono } from "hono";
import { musicActions } from "./actions";
import { musicCommerceRoutes } from "./commerce";
import { musicJobs } from "./jobs";
import { musicMediaRoutes } from "./media";
import { musicPages } from "./pages";

import type { AppEnv } from "../../bindings";

import { musicInvitationsRoutes } from "./invitations";

import { musicAccountRoutes } from "./account";

import { musicArtistsRoutes } from "./artists";

import { musicCommentsRoutes } from "./comments";

import { musicEventsRoutes } from "./events";

import { musicOgRoutes } from "./og";

import { musicOnboardingRoutes } from "./onboarding";

import { musicPostsRoutes } from "./posts";

import { musicProductsRoutes } from "./products";

import { musicReleasesRoutes } from "./releases";

import { musicSpotifyRoutes } from "./spotify";

import { musicSubmissionsRoutes } from "./submissions";

import { musicUploadRoutes } from "./upload";

import { musicUserActivityRoutes } from "./user-activity";

import { musicVenuesRoutes } from "./venues";

import { musicWritersRoutes } from "./writers";

export const musicRouter = new Hono<AppEnv>()
  .route("/venues", musicVenuesRoutes)
  .route("/posts", musicPostsRoutes)
  .route("/writers", musicWritersRoutes)
  .route("/artists", musicArtistsRoutes)
  .route("/events", musicEventsRoutes)
  .route("/releases", musicReleasesRoutes)
  .route("/products", musicProductsRoutes)
  .route("/upload", musicUploadRoutes)

  .route("/", musicSubmissionsRoutes)

  .route("/", musicAccountRoutes)
  .route("/", musicOnboardingRoutes)
  .route("/", musicUserActivityRoutes)
  .route("/", musicCommentsRoutes)
  .route("/", musicSpotifyRoutes)
  .route("/", musicOgRoutes)
  .route("/", musicInvitationsRoutes)
  .route("/pages", musicPages)
  .route("/commerce", musicCommerceRoutes)
  .route("/actions", musicActions)
  .route("/workflow", musicJobs)
  .route("/", musicMediaRoutes);
