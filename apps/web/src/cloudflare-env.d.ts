import type { WebEnv } from "@dpmedia/infra/alchemy.run";
declare global {
  namespace Cloudflare {
    interface Env extends WebEnv {}
  }
}
