import { createWorkersAI } from "workers-ai-provider";
import type { Bindings } from "../../bindings";
export function getWorkersAiModel(env: Bindings) {
  return createWorkersAI({ binding: env.AI })(env.AI_MODEL);
}
