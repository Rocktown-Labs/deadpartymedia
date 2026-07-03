import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi, beforeAll, afterAll } from "vite-plus/test";

// Mock env package FIRST to prevent server-side env access errors in tests
// This must be hoisted (no vi.hoisted needed, just placed early)
vi.mock("@dpmedia/env/web", () => ({
  env: {
    LOG_LEVEL: "silent",
    NODE_ENV: "test",
  },
}));

// Mock logger BEFORE any other mocks to prevent env access during module initialization
vi.mock("@/lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  })),
  createRequestLogger: vi.fn(() => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  })),
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  logger: {
    child: vi.fn(() => ({
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    })),
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock logger submodules
vi.mock("@/lib/logger/context", () => ({
  generateRequestId: vi.fn(() => "test-request-id"),
  withOperationContext: vi.fn((logger) => logger),
  withRequestContext: vi.fn((logger) => logger),
  withUserContext: vi.fn((logger) => logger),
}));

vi.mock("@/lib/logger/middleware", () => ({
  getRequestId: vi.fn(() => "test-request-id"),
  getRequestLogger: vi.fn(() => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  })),
}));

vi.mock("@/lib/logger/sanitize", () => ({
  sanitizeError: vi.fn((error) => ({
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : undefined,
  })),
  sanitizeObject: vi.fn((obj) => obj),
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    asPath: "/",
    back: vi.fn(),
    pathname: "/",
    prefetch: vi.fn(),
    push: vi.fn(),
    query: {},
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js Image component - return a proper img element using React.createElement
vi.mock("next/image", async () => {
  const React = await import("react");
  return {
    default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) =>
      React.createElement("img", { alt, src, ...props }),
  };
});

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: null })),
  clerkClient: vi.fn(() => Promise.resolve({})),
  currentUser: vi.fn(() => Promise.resolve(null)),
  useAuth: () => ({
    isLoaded: true,
    sessionId: null,
    userId: null,
  }),
  useUser: () => ({
    isLoaded: true,
    user: null,
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

// Suppress console errors in tests unless needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ReactDOM.render") ||
        args[0].includes("Not implemented: HTMLFormElement.prototype.submit"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
