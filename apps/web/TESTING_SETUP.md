# Testing Setup Complete

## What Was Implemented

### 1. Test Infrastructure

- ✅ Vitest configuration (`vitest.config.mts`)
- ✅ Playwright configuration (`playwright.config.ts`)
- ✅ Test setup file (`tests/setup.ts`)
- ✅ Test utilities and helpers
- ✅ Mock implementations for Clerk, Database, and Spotify

### 2. Unit Tests

- ✅ Slug generation utilities (`__tests__/unit/lib/utils/slug.test.ts`)
- ✅ Validation schemas (`__tests__/unit/lib/validations/onboarding.test.ts`)
- ✅ Auth utilities (`__tests__/unit/lib/auth/roles.test.ts`, `access.test.ts`)

### 3. Integration Tests

- ✅ Component tests (`__tests__/integration/components/fan-onboarding.test.tsx`)
- ✅ Server action tests (`__tests__/integration/actions/onboarding.test.ts`)
- ✅ API route tests (`__tests__/integration/api/posts.test.ts`)
- ✅ Slug uniqueness tests (`__tests__/integration/lib/utils/slug.test.ts`)

### 4. E2E Tests

- ✅ Authentication flow tests (`e2e/auth.spec.ts`)
- ✅ Public pages tests (`e2e/public-pages.spec.ts`)
- ✅ Onboarding flow tests (`e2e/onboarding.spec.ts`)

## Next Steps

### 1. Install Dependencies

Run the following command to install all testing dependencies:

```bash
cd apps/web
pnpm install
```

### 2. Install Playwright Browsers

After installing dependencies, install Playwright browsers:

```bash
npx playwright install
```

### 3. Set Up Clerk Test Credentials

Create test users in your Clerk Dashboard and set the following environment variables:

```bash
# Required for Clerk testing helpers
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Test user credentials (for fan user)
E2E_CLERK_USER_USERNAME=test-fan@example.com
E2E_CLERK_USER_PASSWORD=test-password-123

# Optional: Separate credentials for different roles
E2E_CLERK_FAN_EMAIL=test-fan@example.com
E2E_CLERK_FAN_PASSWORD=test-password-123
E2E_CLERK_ARTIST_EMAIL=test-artist@example.com
E2E_CLERK_ARTIST_PASSWORD=test-password-123
E2E_CLERK_ADMIN_EMAIL=test-admin@example.com
E2E_CLERK_ADMIN_PASSWORD=test-password-123
```

**Important**:

- Use a **development instance** of Clerk (not production)
- Create test users with username/password authentication enabled
- Store these credentials securely (use `.env.local` and add to `.gitignore`)

### 4. Run Tests

```bash
# Unit and integration tests
pnpm test

# E2E tests (automatically starts server and authenticates users)
pnpm test:e2e

# E2E tests with UI
pnpm test:e2e:ui

# With coverage
pnpm test:coverage
```

### 5. How Clerk Testing Works

The test setup uses Clerk's `@clerk/testing` package which:

1. **Global Setup** (`playwright/global.setup.ts`):
   - Calls `clerkSetup()` to configure Playwright with Clerk
   - Authenticates test users for different roles (fan, artist, admin)
   - Saves authenticated state to `playwright/.clerk/*.json` files

2. **Test Execution**:
   - Tests automatically load the appropriate auth state
   - No need to sign in manually in each test
   - Uses `setupClerkTestingToken()` to bypass bot detection

3. **Test Helpers**:
   - `clerk.signIn()` - Sign in programmatically
   - `clerk.signOut()` - Sign out programmatically
   - `clerk.loaded()` - Assert Clerk has loaded

## Test Coverage

The test suite covers:

- **Utilities**: Slug generation, validation helpers
- **Validations**: Zod schemas for onboarding forms
- **Authentication**: Role checking, permission functions
- **Components**: Onboarding forms, UI components
- **Server Actions**: Onboarding actions, admin operations
- **API Routes**: Posts API, Events API
- **E2E Flows**: Authentication, onboarding, public navigation

## Test Structure

```
apps/web/
├── __tests__/
│   ├── unit/                    # Pure unit tests
│   │   ├── lib/
│   │   │   ├── utils/
│   │   │   ├── validations/
│   │   │   └── auth/
│   └── integration/             # Integration tests
│       ├── components/
│       ├── actions/
│       ├── api/
│       └── lib/
├── e2e/                         # Playwright E2E tests
│   ├── auth.spec.ts
│   ├── public-pages.spec.ts
│   └── onboarding.spec.ts
└── tests/                        # Test infrastructure
    ├── setup.ts
    ├── mocks/
    └── helpers/
```

## Configuration Files

- `vitest.config.mts` - Vitest configuration with Next.js support
- `playwright.config.ts` - Playwright configuration with webServer
- `tests/setup.ts` - Global test setup and mocks
- `.gitignore` - Updated to exclude test artifacts

## Notes

- Tests use mocks for external dependencies (Clerk, Database, Spotify)
- E2E tests require the Next.js server to be running (handled by webServer config)
- Coverage reports are generated in the `coverage/` directory
- Playwright reports are generated in `playwright-report/`

## Future Enhancements

Consider adding:

- More component tests for admin forms
- Cart functionality tests
- Spotify search component tests
- Middleware tests
- Performance tests
- Visual regression tests with Playwright
