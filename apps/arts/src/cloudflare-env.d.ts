import type { ArtsEnv } from "@dpmedia/infra/alchemy.run";
declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends ArtsEnv {}
  }
}
