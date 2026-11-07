import { Hono } from "hono";
import type { AppEnv } from "../../bindings";
import { musicAccountRoutes } from "./account";
import { musicAdminRoutes } from "./admin";
import { musicArtistsRoutes } from "./artists";
import { musicCartRoutes } from "./cart";
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
import { musicWebhooksRoutes } from "./webhooks";
import { musicWritersRoutes } from "./writers";

/**
 * /music/* — routes ported from apps/web API routes.
 * Response shapes match the original Next.js routes exactly.
 */
export const musicRouter = new Hono<AppEnv>();

// Simple resource routers (paths defined at "/...")
musicRouter.route("/venues", musicVenuesRoutes);
musicRouter.route("/posts", musicPostsRoutes);
musicRouter.route("/writers", musicWritersRoutes);
musicRouter.route("/artists", musicArtistsRoutes);
musicRouter.route("/events", musicEventsRoutes);
musicRouter.route("/releases", musicReleasesRoutes);
musicRouter.route("/products", musicProductsRoutes);
musicRouter.route("/upload", musicUploadRoutes);
musicRouter.route("/", musicCartRoutes); // /cart/*
musicRouter.route("/", musicSubmissionsRoutes); // POST /submissions/music-release
musicRouter.route("/", musicAdminRoutes); // /admin/* (staff CRUD)

// Routers whose paths are fully qualified internally
musicRouter.route("/", musicAccountRoutes); // /auth/me, /onboarding/profile
musicRouter.route("/", musicOnboardingRoutes); // POST /onboarding/{artist,fan,venue}
musicRouter.route("/", musicUserActivityRoutes); // /user/*
musicRouter.route("/", musicCommentsRoutes); // /articles/:slug/comments
musicRouter.route("/", musicSpotifyRoutes); // /spotify/*
musicRouter.route("/", musicWebhooksRoutes); // /webhooks
musicRouter.route("/", musicOgRoutes); // /og/:type/:slug
