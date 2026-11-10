import { Hono } from "hono";
import type { AppEnv } from "../../../bindings";
import { adminArtistsActionsRoutes } from "./admin-artists";
import { adminArtistsImportActionsRoutes } from "./admin-artists-import";
import { adminEventsActionsRoutes } from "./admin-events";
import { adminEventsImportActionsRoutes } from "./admin-events-import";
import { adminMusicActionsRoutes } from "./admin-music";
import { adminPostsActionsRoutes } from "./admin-posts";
import { adminPostsWordpressActionsRoutes } from "./admin-posts-wordpress";
import { adminUsersActionsRoutes } from "./admin-users";
import { adminVenuesActionsRoutes } from "./admin-venues";
import { artistDashboardReleasesActionsRoutes } from "./artist-dashboard-releases";
import { venueDashboardEventsActionsRoutes } from "./venue-dashboard-events";
export const musicActions = new Hono<AppEnv>()
  .route("/", adminPostsActionsRoutes)
  .route("/", adminEventsActionsRoutes)
  .route("/", adminVenuesActionsRoutes)
  .route("/", adminMusicActionsRoutes)
  .route("/", adminArtistsActionsRoutes)
  .route("/", adminUsersActionsRoutes)
  .route("/", adminArtistsImportActionsRoutes)
  .route("/", artistDashboardReleasesActionsRoutes)
  .route("/", venueDashboardEventsActionsRoutes)
  .route("/", adminEventsImportActionsRoutes)
  .route("/", adminPostsWordpressActionsRoutes);
