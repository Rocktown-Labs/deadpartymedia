import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vite-plus/test";
vi.mock("@/lib/auth-client", () => ({
  useMusicSession: () => ({ session: null, isPending: false }),
  authClient: {
    getSession: vi.fn(async () => ({ data: null })),
    signOut: vi.fn(async () => ({ error: null })),
  },
  musicSessionKey: ["music", "session"],
}));
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
  },
}));
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});
