# Clerk Testing Integration

This document explains how Clerk authentication testing is integrated with Playwright E2E tests.

## Overview

We use `@clerk/testing` package to authenticate users in Playwright tests without interacting with the UI. This makes tests faster, more reliable, and easier to maintain.

## Setup

### 1. Package Installation

The `@clerk/testing` package is already installed as a dev dependency.

### 2. Environment Variables

Set the following environment variables (preferably in `.env.local`):

```bash
# Required: Clerk API keys (use development instance keys)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Required: Test user credentials for fan user
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

**Important Notes:**
- Use a **development instance** of Clerk (not production)
- Create test users with **username/password** authentication enabled
- Test users should have appropriate roles set in Clerk Dashboard
- Never commit these credentials to version control

### 3. Global Setup

The `playwright/global.setup.ts` file:
- Calls `clerkSetup()` to configure Playwright with Clerk
- Authenticates test users for different roles (fan, artist, admin)
- Saves authenticated state to `playwright/.clerk/*.json` files

These auth state files are reused across tests, eliminating the need to sign in for each test.

## How It Works

### Authentication State Storage

When you run E2E tests, the global setup:
1. Authenticates a fan user → saves to `playwright/.clerk/user.json`
2. Authenticates an artist user → saves to `playwright/.clerk/artist.json`
3. Authenticates an admin user → saves to `playwright/.clerk/admin.json`

### Test Projects

The `playwright.config.ts` defines different test projects that automatically load the appropriate auth state:

- **Public tests**: No authentication required
- **Authenticated fan tests**: Uses `user.json` (matches `*onboarding*.spec.ts`, `*dashboard*.spec.ts`)
- **Authenticated artist tests**: Uses `artist.json` (matches `*artist*.spec.ts`)
- **Authenticated admin tests**: Uses `admin.json` (matches `*admin*.spec.ts`)

### Test Helpers

#### `setupClerkTestingToken({ page })`

Call this at the start of each test to bypass Clerk's bot detection:

```typescript
import { setupClerkTestingToken } from '@clerk/testing/playwright'

test('my test', async ({ page }) => {
  await setupClerkTestingToken({ page })
  // ... rest of test
})
```

#### `clerk.signIn({ page, signInParams })`

Sign in programmatically (useful for tests that need to test sign-in flow):

```typescript
import { clerk } from '@clerk/testing/playwright'

await clerk.signIn({
  page,
  signInParams: {
    strategy: 'password',
    identifier: 'test@example.com',
    password: 'password123',
  },
})
```

#### `clerk.signOut({ page })`

Sign out programmatically:

```typescript
await clerk.signOut({ page })
```

#### `clerk.loaded({ page })`

Assert that Clerk has loaded:

```typescript
await clerk.loaded({ page })
```

## Writing Tests

### Unauthenticated Tests

For tests that don't require authentication (public pages):

```typescript
import { test, expect } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'

test('should show homepage', async ({ page }) => {
  await setupClerkTestingToken({ page })
  await page.goto('/')
  await expect(page).toHaveTitle(/dead party media/i)
})
```

### Authenticated Tests (Automatic)

For tests that match project patterns in `playwright.config.ts`, auth state is automatically loaded:

```typescript
import { test, expect } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'

// This test automatically uses fan user auth state
test('should access dashboard', async ({ page }) => {
  await setupClerkTestingToken({ page })
  await page.goto('/dashboard')
  await expect(page).not.toHaveURL(/sign-in/)
})
```

### Authenticated Tests (Manual)

For tests that need to sign in manually:

```typescript
import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

test('should sign in and access dashboard', async ({ page }) => {
  await setupClerkTestingToken({ page })
  await page.goto('/')
  await clerk.loaded({ page })
  
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: process.env.E2E_CLERK_USER_USERNAME!,
      password: process.env.E2E_CLERK_USER_PASSWORD!,
    },
  })
  
  await page.goto('/dashboard')
  await expect(page).not.toHaveURL(/sign-in/)
})
```

## Supported Sign-In Strategies

The `clerk.signIn()` helper supports:
- `password` - Username/email + password
- `phone_code` - Phone number (only in development, requires test phone like `+15555550100`)
- `email_code` - Email code (only in development, requires test email like `your_email+clerk_test@example.com`)

**Note**: Multi-factor authentication (MFA) is not supported by the testing helpers.

## Troubleshooting

### Tests failing with authentication errors

1. **Check environment variables**: Ensure `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set
2. **Check test user credentials**: Verify `E2E_CLERK_USER_USERNAME` and `E2E_CLERK_USER_PASSWORD` are correct
3. **Verify user exists**: Make sure test users exist in your Clerk Dashboard
4. **Check authentication method**: Ensure username/password authentication is enabled in Clerk Dashboard

### Auth state files not being created

1. **Check global setup**: Ensure `playwright/global.setup.ts` is running
2. **Check file permissions**: Ensure the `playwright/.clerk` directory is writable
3. **Check console output**: Look for errors in the global setup execution

### Tests using wrong auth state

1. **Check test file naming**: Ensure test files match the patterns in `playwright.config.ts` projects
2. **Check project configuration**: Verify the `storageState` path matches the auth file you want to use
3. **Manual override**: Use `test.use({ storageState: 'playwright/.clerk/user.json' })` in a test file

## Best Practices

1. **Always call `setupClerkTestingToken()`**: This bypasses bot detection and is required for Clerk to work in tests
2. **Use automatic auth state when possible**: Let Playwright projects handle auth state loading
3. **Create separate test users**: Use different users for different roles to test role-based access
4. **Clean up auth state**: The `.clerk` directory is gitignored, but you may want to regenerate it if users change
5. **Use development instance**: Never use production Clerk keys or users in tests

## References

- [Clerk Testing Documentation](https://clerk.com/docs/guides/development/testing/playwright/overview)
- [Clerk Test Helpers](https://clerk.com/docs/guides/development/testing/playwright/test-helpers)
- [Playwright Authentication](https://playwright.dev/docs/auth)
