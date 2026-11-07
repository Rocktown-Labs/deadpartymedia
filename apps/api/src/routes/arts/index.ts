import { Hono } from "hono";
import type { AppEnv } from "../../bindings";

/**
 * /arts/* — routes ported from apps/arts server functions.
 * Populated during Phase 1 router porting (MIGRATION_PLAN.md).
 */
export const artsRouter = new Hono<AppEnv>();
