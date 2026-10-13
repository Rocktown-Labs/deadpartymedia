import { createWorkersAI } from "workers-ai-provider";

export const DEFAULT_CLOUDFLARE_AI_MODEL = "@cf/zai-org/glm-5.3-flash";

export interface CloudflareAiConfig {
  accountId: string;
  apiKey: string;
  model: string;
}

/**
 * Validates and retrieves Cloudflare Workers AI credentials from environment variables.
 */
export function getCloudflareAiConfig(): CloudflareAiConfig {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiKey = process.env.CLOUDFLARE_API_TOKEN ?? process.env.CLOUDFLARE_API_KEY;
  const model = process.env.CLOUDFLARE_AI_MODEL || DEFAULT_CLOUDFLARE_AI_MODEL;

  if (!accountId || !apiKey) {
    throw new Error(
      "Missing Cloudflare Workers AI credentials: configure CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.",
    );
  }

  return { accountId, apiKey, model };
}

/**
 * Returns an AI SDK LanguageModel instance powered by Cloudflare Workers AI.
 * Allows overriding model per-call (e.g., "@cf/google/gemma-4-26b-a4b-it").
 */
export function getWorkersAiModel(overrideModel?: string) {
  const { accountId, apiKey, model } = getCloudflareAiConfig();
  const workersai = createWorkersAI({ accountId, apiKey });
  return workersai(overrideModel || model);
}
