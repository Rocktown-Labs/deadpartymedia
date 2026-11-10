import { Hono } from "hono";
import { artsInvitationsRoutes } from "./invitations";
import { artsMediaRoutes } from "./media";

import type { AppEnv } from "../../bindings";

import { artsAdminRoutes } from "./admin";

import { artsArtmakersRoutes } from "./artmakers";

import { artsArtworksRoutes } from "./artworks";

import { artsCommerceRoutes } from "./commerce";

import { artsContentRoutes } from "./content";

import { artsVenuesRoutes } from "./venues";

export const artsRouter = new Hono<AppEnv>()
  .route("/", artsMediaRoutes)
  .get("/session", (c) => {
    c.header("Cache-Control", "private, no-store");
    return c.json(c.get("auth"));
  })
  .route("/", artsInvitationsRoutes)
  .route("/", artsArtmakersRoutes)
  .route("/", artsArtworksRoutes)
  .route("/", artsContentRoutes)
  .route("/", artsVenuesRoutes)
  .route("/", artsCommerceRoutes)
  .route("/", artsAdminRoutes)
  .get("/auth/providers", (c) =>
    c.json({ google: !!c.env.GOOGLE_CLIENT_ID && !!c.env.GOOGLE_CLIENT_SECRET }),
  );
