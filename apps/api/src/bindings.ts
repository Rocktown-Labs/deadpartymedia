/**
 * Worker bindings for the Dead Party Media API.
 *
 * Vars are set in wrangler.jsonc; secrets via `wrangler secret put`
 * (or .dev.vars locally).
 */
export interface Bindings {
  /** Neon Postgres connection string (pooled endpoint, HTTP driver). */
  DATABASE_URL: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_WEBHOOK_SIGNING_SECRET?: string;
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;
  WEB_APP_URL?: string;
  ARTS_APP_URL?: string;
  CLOUDFLARE_R2_ACCOUNT_ID?: string;
  CLOUDFLARE_R2_ACCESS_KEY_ID?: string;
  CLOUDFLARE_R2_SECRET_ACCESS_KEY?: string;
  CLOUDFLARE_R2_BUCKET?: string;
  CLOUDFLARE_R2_PUBLIC_URL?: string;
  /** Fourthwall storefront (arts commerce) */
  FW_API_URL?: string;
  FW_STOREFRONT_TOKEN?: string;
  FW_CHECKOUT_URL?: string;
  FW_ARTS_COLLECTION_ID?: string;
}

/** Authenticated user context attached by the clerk auth middleware. */
export interface AuthContext {
  userId: string;
  sessionId: string | null;
  claims: Record<string, unknown>;
}

export interface AppEnv {
  Bindings: Bindings;
  Variables: {
    auth: AuthContext | null;
  };
}
