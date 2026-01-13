# Testing Guide

This directory contains the testing infrastructure for the Dead Party Media web application.

## Test Structure

```
apps/web/
├── __tests__/              # Unit and integration tests
│   ├── unit/              # Unit tests for utilities, validations, etc.
│   └── integration/       # Integration tests for components, actions, API routes
├── e2e/                   # Playwright end-to-end tests
└── tests/                 # Test utilities and setup
    ├── setup.ts           # Global test setup
    ├── mocks/             # Mock implementations
    └── helpers/           # Test helper functions
```

## Running Tests

### Unit and Integration Tests (Vitest)

```bash
# Run all tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run tests once (CI mode)
npm run test -- --run
```

### End-to-End Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/auth.spec.ts
```

## Test Types

### Unit Tests

Unit tests are located in `__tests__/unit/` and test individual functions and utilities in isolation:

- **Utilities**: Slug generation, validation helpers
- **Validations**: Zod schema validation
- **Auth**: Role checking, permission functions

### Integration Tests

Integration tests are located in `__tests__/integration/` and test how multiple parts work together:

- **Components**: React component testing with React Testing Library
- **Server Actions**: Testing server-side actions with mocked dependencies
- **API Routes**: Testing API endpoints

### E2E Tests

End-to-end tests are located in `e2e/` and test complete user flows:

- Authentication flows
- Onboarding processes
- Public page navigation
- Admin operations

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { generateSlug } from '@/lib/utils/slug'

describe('generateSlug', () => {
  it('should convert title to lowercase slug', () => {
    expect(generateSlug('Test Artist Name')).toBe('test-artist-name')
  })
})
```

### Component Test Example

```typescript
import { renderWithProviders, screen } from '@/tests/helpers/render'
import { MyComponent } from '@/components/my-component'

describe('MyComponent', () => {
  it('should render correctly', () => {
    renderWithProviders(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'

test('should navigate to about page', async ({ page }) => {
  await setupClerkTestingToken({ page })
  await page.goto('/')
  await page.click('text=About')
  await expect(page).toHaveURL('/about')
})
```

### Authenticated E2E Test Example

```typescript
import { test, expect } from '@playwright/test'
import { setupClerkTestingToken, clerk } from '@clerk/testing/playwright'

test('should access protected page when authenticated', async ({ page }) => {
  await setupClerkTestingToken({ page })
  await page.goto('/')
  await clerk.loaded({ page })
  
  // Sign in programmatically
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: process.env.E2E_CLERK_USER_USERNAME!,
      password: process.env.E2E_CLERK_USER_PASSWORD!,
    },
  })
  
  // Access protected route
  await page.goto('/dashboard')
  await expect(page).not.toHaveURL(/sign-in/)
})
```

**Note**: For tests that match patterns in `playwright.config.ts` projects, authenticated state is automatically loaded from `playwright/.clerk/*.json` files created during global setup.

## Test Utilities

### Mock Helpers

- `tests/mocks/clerk.ts` - Clerk authentication mocks
- `tests/mocks/db.ts` - Database mocks
- `tests/mocks/spotify.ts` - Spotify API mocks

### Test Helpers

- `tests/helpers/render.tsx` - Enhanced render function with providers
- `tests/helpers/auth-helpers.ts` - Authentication test utilities
- `tests/helpers/db-helpers.ts` - Database test utilities

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Mocking**: Mock external dependencies (Clerk, database, APIs)
3. **Coverage**: Aim for 80%+ coverage on critical paths
4. **Naming**: Use descriptive test names that explain what is being tested
5. **Edge Cases**: Test error scenarios, boundary conditions, and edge cases
6. **Cleanup**: Always clean up mocks and state after tests

## CI/CD

Tests run automatically on:
- Pull requests
- Before merging to main
- On deployment

Coverage reports are generated and can be viewed in the CI output.

## Troubleshooting

### Tests failing with "Cannot find module"

Make sure path aliases in `vitest.config.mts` match those in `tsconfig.json`.

### Playwright tests timing out

Ensure the Next.js server is running or use the `webServer` configuration in `playwright.config.ts`.

### Mock not working

Check that mocks are set up before the module is imported. Use `vi.mock()` at the top level of test files.
