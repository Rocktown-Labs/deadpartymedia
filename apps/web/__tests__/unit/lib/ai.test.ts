import { DEFAULT_CLOUDFLARE_AI_MODEL, getCloudflareAiConfig, getWorkersAiModel } from "@/lib/ai";
import { createWorkersAI } from "workers-ai-provider";

vi.mock("workers-ai-provider", () => ({
  createWorkersAI: vi.fn(),
}));

describe("ai lib (Cloudflare Workers AI)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_API_KEY;
    delete process.env.CLOUDFLARE_AI_MODEL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getCloudflareAiConfig", () => {
    it("should throw an error when CLOUDFLARE_ACCOUNT_ID is missing", () => {
      process.env.CLOUDFLARE_API_TOKEN = "test-token";

      expect(() => getCloudflareAiConfig()).toThrow(
        "Missing Cloudflare Workers AI credentials: configure CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.",
      );
    });

    it("should throw an error when API token/key is missing", () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";

      expect(() => getCloudflareAiConfig()).toThrow(
        "Missing Cloudflare Workers AI credentials: configure CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.",
      );
    });

    it("should return config with default model using CLOUDFLARE_API_TOKEN", () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = "acc-123";
      process.env.CLOUDFLARE_API_TOKEN = "token-abc";

      const config = getCloudflareAiConfig();
      expect(config).toEqual({
        accountId: "acc-123",
        apiKey: "token-abc",
        model: DEFAULT_CLOUDFLARE_AI_MODEL,
      });
    });

    it("should fallback to CLOUDFLARE_API_KEY if CLOUDFLARE_API_TOKEN is not set", () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = "acc-123";
      process.env.CLOUDFLARE_API_KEY = "key-xyz";

      const config = getCloudflareAiConfig();
      expect(config.apiKey).toBe("key-xyz");
    });

    it("should respect CLOUDFLARE_AI_MODEL environment variable", () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = "acc-123";
      process.env.CLOUDFLARE_API_TOKEN = "token-abc";
      process.env.CLOUDFLARE_AI_MODEL = "@cf/google/gemma-4-26b-a4b-it";

      const config = getCloudflareAiConfig();
      expect(config.model).toBe("@cf/google/gemma-4-26b-a4b-it");
    });
  });

  describe("getWorkersAiModel", () => {
    it("should initialize createWorkersAI and invoke it with configured model", () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = "acc-123";
      process.env.CLOUDFLARE_API_TOKEN = "token-abc";

      const mockModelInstance = { modelId: "test-model" };
      const mockProviderFn = vi.fn().mockReturnValue(mockModelInstance);
      vi.mocked(createWorkersAI).mockReturnValue(
        mockProviderFn as unknown as ReturnType<typeof createWorkersAI>,
      );

      const model = getWorkersAiModel();

      expect(createWorkersAI).toHaveBeenCalledWith({
        accountId: "acc-123",
        apiKey: "token-abc",
      });
      expect(mockProviderFn).toHaveBeenCalledWith(DEFAULT_CLOUDFLARE_AI_MODEL);
      expect(model).toBe(mockModelInstance);
    });

    it("should support overriding the model parameter on call", () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = "acc-123";
      process.env.CLOUDFLARE_API_TOKEN = "token-abc";

      const mockModelInstance = { modelId: "custom-model" };
      const mockProviderFn = vi.fn().mockReturnValue(mockModelInstance);
      vi.mocked(createWorkersAI).mockReturnValue(
        mockProviderFn as unknown as ReturnType<typeof createWorkersAI>,
      );

      const model = getWorkersAiModel("@cf/google/gemma-4-26b-a4b-it");

      expect(mockProviderFn).toHaveBeenCalledWith("@cf/google/gemma-4-26b-a4b-it");
      expect(model).toBe(mockModelInstance);
    });
  });
});
