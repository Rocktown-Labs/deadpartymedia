import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { artworkIdSchema } from "./arts-schemas";

/**
 * Shared request parsing / error helpers for the /arts routers.
 *
 * The TanStack server functions validated their input with zod before the
 * handler ran and threw `new Error(...)` for missing rows; here the same
 * failures become JSON HTTP errors: schema failures → 400 with the first
 * zod issue message, missing rows → 404, guard failures → 401/403 (thrown
 * by requireAuth/requireRole in ../auth).
 */

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request";
}

export function invalid(message: string): HTTPException {
  return new HTTPException(400, { res: Response.json({ error: message }) });
}

export function notFound(message: string): HTTPException {
  return new HTTPException(404, { res: Response.json({ error: message }) });
}

export function forbidden(): HTTPException {
  return new HTTPException(403, { res: Response.json({ error: "Forbidden" }) });
}

/**
 * Read + validate a JSON request body. Non-JSON bodies and schema failures
 * both surface as 400 { error: first issue message }.
 */
export async function parseJsonBody<S extends z.ZodType>(
  c: Context,
  schema: S,
): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw invalid("Invalid JSON body");
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw invalid(firstIssueMessage(parsed.error));
  }
  return parsed.data;
}

/**
 * Read + validate a JSON request body, overriding one field from a URL
 * param (e.g. merging `id` from /artworks/:id into the body object before
 * running the same schema the server fn used). Param wins over body.
 */
export async function parseJsonBodyWithParam<S extends z.ZodType>(
  c: Context,
  schema: S,
  name: string,
): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw invalid("Invalid JSON body");
  }

  const base = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const parsed = schema.safeParse({
    ...base,
    [name]: Number(c.req.param(name)),
  });
  if (!parsed.success) {
    throw invalid(firstIssueMessage(parsed.error));
  }
  return parsed.data;
}

/** Validate query params against a schema (strings; use coercion for numbers). */
export function parseQuery<S extends z.ZodType>(c: Context, schema: S): z.output<S> {
  const parsed = schema.safeParse(c.req.query());
  if (!parsed.success) {
    throw invalid(firstIssueMessage(parsed.error));
  }
  return parsed.data;
}

/** Validate a URL param against a schema. */
export function parseParam<S extends z.ZodType>(c: Context, schema: S): z.output<S> {
  const parsed = schema.safeParse(c.req.param());
  if (!parsed.success) {
    throw invalid(firstIssueMessage(parsed.error));
  }
  return parsed.data;
}

/**
 * Validate a numeric `:id` URL param with the same `z.number()` schema the
 * server fn validators used on their `{ id }` inputs (artworkIdSchema).
 * Non-numeric segments fail validation → 400.
 */
export function idFromParam(c: Context, name = "id"): number {
  const parsed = artworkIdSchema.safeParse({ id: Number(c.req.param(name)) });
  if (!parsed.success) {
    throw invalid(firstIssueMessage(parsed.error));
  }
  return parsed.data.id;
}
