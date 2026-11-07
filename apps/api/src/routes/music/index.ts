import { Hono } from "hono";
import type { AppEnv } from "../../bindings";
import { musicVenuesRoutes } from "./venues";

/**
 * /music/* — routes ported from apps/web API routes.
 * Response shapes match the original Next.js routes exactly.
 */
export const musicRouter = new Hono<AppEnv>();

musicRouter.route("/venues", musicVenuesRoutes);
