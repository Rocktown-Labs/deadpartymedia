import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi, beforeAll, afterAll } from 'vitest'

// Mock env package FIRST to prevent server-side env access errors in tests
// This must be hoisted (no vi.hoisted needed, just placed early)
vi.mock('@dpmedia/env/web', () => ({
  env: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  },
}))

// Mock logger BEFORE any other mocks to prevent env access during module initialization
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  },
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
  createRequestLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock logger submodules
vi.mock('@/lib/logger/context', () => ({
  generateRequestId: vi.fn(() => 'test-request-id'),
  withRequestContext: vi.fn((logger) => logger),
  withUserContext: vi.fn((logger) => logger),
  withOperationContext: vi.fn((logger) => logger),
}))

vi.mock('@/lib/logger/middleware', () => ({
  getRequestId: vi.fn(() => 'test-request-id'),
  getRequestLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}))

vi.mock('@/lib/logger/sanitize', () => ({
  sanitizeError: vi.fn((error) => ({
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : undefined,
  })),
  sanitizeObject: vi.fn((obj) => obj),
}))

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Next.js Image component - return a proper img element using React.createElement
vi.mock('next/image', async () => {
  const React = await import('react')
  return {
    default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => {
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
      return React.createElement('img', { src, alt, ...props })
    },
  }
})

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: null,
    isLoaded: true,
  }),
  useAuth: () => ({
    userId: null,
    sessionId: null,
    isLoaded: true,
  }),
  auth: vi.fn(() => Promise.resolve({ userId: null })),
  clerkClient: vi.fn(() => Promise.resolve({})),
  currentUser: vi.fn(() => Promise.resolve(null)),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

// Suppress console errors in tests unless needed
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
