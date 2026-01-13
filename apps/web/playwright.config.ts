import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Global setup file for Clerk authentication */
  globalSetup: './playwright/global.setup.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3001',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: (() => {
    const shouldRunAuthenticated = process.env.E2E_RUN_AUTHENTICATED === 'true'

    const baseProjects = [
      // Public tests - no authentication required
      {
        name: 'public tests',
        testMatch: /.*public.*\.spec\.ts/,
        use: { ...devices['Desktop Chrome'] },
      },
      // All other tests (unauthenticated)
      {
        name: 'chromium',
        testMatch: /.*auth\.spec\.ts/,
        use: { ...devices['Desktop Chrome'] },
      },
      {
        name: 'firefox',
        testMatch: /.*public.*\.spec\.ts/,
        use: { ...devices['Desktop Firefox'] },
      },
      {
        name: 'webkit',
        testMatch: /.*public.*\.spec\.ts/,
        use: { ...devices['Desktop Safari'] },
      },
    ] as const

    if (!shouldRunAuthenticated) return [...baseProjects]

    return [
      ...baseProjects,
      // Authenticated fan tests
      {
        name: 'authenticated fan tests',
        // Fan-only suites (avoid artist dashboard suite which also contains "dashboard" in its filename)
        testMatch: /.*(onboarding|authenticated)\.spec\.ts/,
        use: {
          ...devices['Desktop Chrome'],
          storageState: 'playwright/.clerk/user.json',
        },
      },
      // Authenticated artist tests
      {
        name: 'authenticated artist tests',
        testMatch: /.*artist-dashboard\.spec\.ts/,
        use: {
          ...devices['Desktop Chrome'],
          storageState: 'playwright/.clerk/artist.json',
        },
      },
      // Authenticated admin tests
      {
        name: 'authenticated admin tests',
        testMatch: /.*admin\.spec\.ts/,
        use: {
          ...devices['Desktop Chrome'],
          storageState: 'playwright/.clerk/admin.json',
        },
      },
    ]
  })(),

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
