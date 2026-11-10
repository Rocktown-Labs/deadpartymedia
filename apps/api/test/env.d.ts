import type { ApiEnv } from "@dpmedia/infra/alchemy.run";
import type { D1Migration } from "@cloudflare/vitest-pool-workers";
declare global {
  namespace Cloudflare {
    interface Env extends ApiEnv {
      MUSIC_MIGRATIONS: D1Migration[];
      ARTS_MIGRATIONS: D1Migration[];
      AUTH_MIGRATIONS: D1Migration[];
    }
  }
}
