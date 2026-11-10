import { env, applyD1Migrations } from "cloudflare:test";
await applyD1Migrations(env.ARTS_DB, env.ARTS_MIGRATIONS);
await applyD1Migrations(env.AUTH_DB, env.AUTH_MIGRATIONS);

await applyD1Migrations(env.MUSIC_DB, env.MUSIC_MIGRATIONS);
