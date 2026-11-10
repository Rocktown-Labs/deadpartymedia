import type { BackfillInput, DedupeInput } from "@dpmedia/contracts";
import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Alchemy from "alchemy";
import * as Output from "alchemy/Output";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import { resourceName } from "./resources";

const name = (base: string) =>
  Output.fromEffect(Effect.map(Alchemy.Stage, (stage) => resourceName(base, stage)));
const retainProduction = Alchemy.RemovalPolicy.retain(
  Effect.map(Alchemy.Stage, (stage) => stage === "production"),
);

const appUrl = (app: "arts" | "music") =>
  Effect.gen(function* () {
    const local = (yield* Alchemy.ProviderMode.defaultProviderMode) === "local";
    const stage = yield* Alchemy.Stage;
    const subdomain = yield* Config.String("WORKERS_SUBDOMAIN").pipe(
      Config.withDefault("rocktown-labs"),
    );
    const fallback = local
      ? `http://localhost:${app === "arts" ? 3002 : 3001}`
      : stage === "production"
        ? `https://${app === "arts" ? "deadpartyarts.com" : "www.deadpartymedia.com"}`
        : `https://${resourceName(app === "arts" ? "deadpartyarts" : "deadpartymedia", stage)}.${subdomain}.workers.dev`;
    return yield* Config.String(app === "arts" ? "ARTS_APP_URL" : "WEB_APP_URL").pipe(
      Config.withDefault(fallback),
    );
  });
const trustedOrigins = Effect.gen(function* () {
  const fallback = [yield* appUrl("arts"), yield* appUrl("music")];
  if ((yield* Alchemy.Stage) === "production") fallback.push("https://deadpartymedia.com");
  return yield* Config.String("TRUSTED_ORIGINS").pipe(Config.withDefault(fallback.join(",")));
});
// Domain attachment changes DNS. Enable only for the production cutover.
const domain = (app: "arts" | "music" | "api") =>
  Effect.gen(function* () {
    if (
      (yield* Alchemy.Stage) !== "production" ||
      !(yield* Config.Boolean("BIND_DOMAINS").pipe(Config.withDefault(false)))
    )
      return undefined;
    if (app === "api") return { name: "api.deadpartymedia.com" };
    return app === "arts"
      ? { name: "deadpartyarts.com" }
      : { name: "www.deadpartymedia.com", redirects: ["deadpartymedia.com"] };
  });

export const artsDatabase = Cloudflare.D1.Database("arts-db", {
  name: name("deadpartyarts"),
  migrations: "../db/migrations/arts",
}).pipe(retainProduction);
export const musicDatabase = Cloudflare.D1.Database("music-db", {
  name: name("deadpartymedia"),
  migrations: "../db/migrations/music",
}).pipe(retainProduction);
export const authDatabase = Cloudflare.D1.Database("auth-db", {
  name: name("deadparty-auth"),
  migrations: "../auth/migrations",
}).pipe(retainProduction);

// Explicit physical names support adoption of existing buckets. Inspect their
// configuration first: adopting a resource also assumes ownership of its settings.
export const artsMedia = Cloudflare.R2.Bucket("arts-media", {
  name: Output.fromEffect(
    Effect.gen(function* () {
      const base = yield* Config.String("ARTS_BUCKET_NAME").pipe(
        Config.withDefault("deadpartyarts"),
      );
      return resourceName(base, yield* Alchemy.Stage);
    }).pipe(Effect.orDie),
  ),
  cors: [
    {
      allowedOrigins: ["https://deadpartyarts.com", "http://localhost:3000"],
      allowedMethods: ["GET", "PUT", "POST"],
      allowedHeaders: ["Content-Type", "x-amz-*"],
      maxAgeSeconds: 3600,
    },
  ],
  publicAccess: true,
  lifecycleRules: [
    {
      id: "Default Multipart Abort Rule",
      enabled: true,
      abortMultipartUploadsTransition: { condition: { type: "Age", maxAge: 604800 } },
    },
  ],
}).pipe(retainProduction);
export const musicMedia = Cloudflare.R2.Bucket("music-media", {
  name: Output.fromEffect(
    Effect.gen(function* () {
      const base = yield* Config.String("MUSIC_BUCKET_NAME").pipe(
        Config.withDefault("deadpartymedia"),
      );
      return resourceName(base, yield* Alchemy.Stage);
    }).pipe(Effect.orDie),
  ),
}).pipe(retainProduction);

export const api = Cloudflare.Worker("api", {
  name: name("deadparty-api"),
  main: "../../apps/api/src/index.ts",
  domain: Output.fromEffect(domain("api").pipe(Effect.orDie)),
  compatibility: { date: "2026-03-17", flags: ["nodejs_compat"] },
  env: {
    BACKFILL: Effect.map(Alchemy.Stage, (stage) =>
      Cloudflare.Workflow<BackfillInput>("backfill", {
        className: "WordPressBackfill",
        workflowName: resourceName("deadparty-backfill", stage),
      }),
    ),
    DEDUPE: Effect.map(Alchemy.Stage, (stage) =>
      Cloudflare.Workflow<DedupeInput>("dedupe", {
        className: "PostDedupe",
        workflowName: resourceName("deadparty-dedupe", stage),
      }),
    ),
    AI: Cloudflare.Workers.AI(),
    AI_MODEL: Config.String("AI_MODEL").pipe(Config.withDefault("@cf/zai-org/glm-5.3-flash")),
    GOOGLE_CLIENT_ID: Config.String("GOOGLE_CLIENT_ID").pipe(Config.withDefault("")),
    GOOGLE_CLIENT_SECRET: Config.Redacted("GOOGLE_CLIENT_SECRET").pipe(Config.withDefault("")),
    EMAIL: Cloudflare.Email.SendEmail("EMAIL"),
    MAIL_FROM: Config.String("MAIL_FROM").pipe(Config.withDefault("noreply@deadpartymedia.com")),
    ARTS_DB: artsDatabase,
    MUSIC_DB: musicDatabase,
    AUTH_DB: authDatabase,
    ARTS_MEDIA: artsMedia,
    MUSIC_MEDIA: musicMedia,
    BETTER_AUTH_SECRET: Config.Redacted("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: Cloudflare.Worker.URL,
    TRUSTED_ORIGINS: Output.fromEffect(trustedOrigins.pipe(Effect.orDie)),
    ARTS_APP_URL: Output.fromEffect(appUrl("arts").pipe(Effect.orDie)),
    WEB_APP_URL: Output.fromEffect(appUrl("music").pipe(Effect.orDie)),
    CLOUDFLARE_R2_PUBLIC_URL: Config.String("ARTS_MEDIA_URL").pipe(Config.withDefault("")),
    MUSIC_MEDIA_URL: Config.String("MUSIC_MEDIA_URL").pipe(Config.withDefault("")),
    SPOTIFY_CLIENT_ID: Config.Redacted("SPOTIFY_CLIENT_ID").pipe(Config.withDefault("")),
    SPOTIFY_CLIENT_SECRET: Config.Redacted("SPOTIFY_CLIENT_SECRET").pipe(Config.withDefault("")),
    FW_API_URL: Config.String("FW_API_URL").pipe(
      Config.withDefault("https://storefront-api.fourthwall.com/v1"),
    ),
    FW_STOREFRONT_TOKEN: Config.Redacted("FW_STOREFRONT_TOKEN").pipe(Config.withDefault("")),
    FW_CHECKOUT_URL: Config.String("FW_CHECKOUT_URL").pipe(Config.withDefault("")),
    FW_ARTS_COLLECTION_ID: Config.String("FW_ARTS_COLLECTION_ID").pipe(Config.withDefault("")),
  },
  dev: { port: 3000 },
});
export type ApiEnv = Cloudflare.InferEnv<typeof api>;

export const arts = Cloudflare.Website.Vite("arts", {
  name: name("deadpartyarts"),
  domain: Output.fromEffect(domain("arts").pipe(Effect.orDie)),
  rootDir: "../../apps/arts",
  compatibility: { date: "2026-03-17", flags: ["nodejs_compat"] },
  env: { API: api },
  dev: { port: 3002 },
});
export type ArtsEnv = Cloudflare.InferEnv<typeof arts>;

export const web = Cloudflare.Website.Vite("web", {
  name: name("deadpartymedia"),
  domain: Output.fromEffect(domain("music").pipe(Effect.orDie)),
  rootDir: "../../apps/web",
  compatibility: { date: "2026-03-17", flags: ["nodejs_compat"] },
  env: { API: api },
  dev: { port: 3001 },
});
export type WebEnv = Cloudflare.InferEnv<typeof web>;

export default Alchemy.Stack(
  "deadparty",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const backend = yield* api;
    const artsApp = yield* arts;
    const webApp = yield* web;
    return { api: backend.url, arts: artsApp.url, web: webApp?.url };
  }),
);
