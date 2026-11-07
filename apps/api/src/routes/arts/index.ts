import { Hono } from "hono";
import type { AppEnv } from "../../bindings";
import { artsAdminRoutes } from "./admin";
import { artsArtmakersRoutes } from "./artmakers";
import { artsArtworksRoutes } from "./artworks";
import { artsCommerceRoutes } from "./commerce";
import { artsContentRoutes } from "./content";
import { artsVenuesRoutes } from "./venues";

/**
 * /arts/* — routes ported from apps/arts server functions.
 * All routers define fully qualified paths internally.
 */
export const artsRouter = new Hono<AppEnv>();

artsRouter.route("/", artsArtmakersRoutes);
artsRouter.route("/", artsArtworksRoutes);
artsRouter.route("/", artsContentRoutes);
artsRouter.route("/", artsVenuesRoutes);
artsRouter.route("/", artsCommerceRoutes);
artsRouter.route("/", artsAdminRoutes);
