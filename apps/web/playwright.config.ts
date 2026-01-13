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
  projects: [
    // Global setup project - runs first to authenticate users
    {
      name: 'global setup',
      testMatch: /global\.setup\.ts/,
    },
    // Public tests - no authentication required
    {
      name: 'public tests',
      testMatch: /.*public.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['global setup'],
    },
    // Authenticated fan tests
    {
      name: 'authenticated fan tests',
      testMatch: /.*(onboarding|dashboard).*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Use prepared Clerk auth state for fan user
        storageState: 'playwright/.clerk/user.json',
      },
      dependencies: ['global setup'],
    },
    // Authenticated artist tests
    {
      name: 'authenticated artist tests',
      testMatch: /.*artist.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Use prepared Clerk auth state for artist user
        storageState: 'playwright/.clerk/artist.json',
      },
      dependencies: ['global setup'],
    },
    // Authenticated admin tests
    {
      name: 'authenticated admin tests',
      testMatch: /.*admin.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Use prepared Clerk auth state for admin user
        storageState: 'playwright/.clerk/admin.json',
      },
      dependencies: ['global setup'],
    },
    // All other tests (unauthenticated)
    {
      name: 'chromium',
      testMatch: /.*auth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['global setup'],
    },
    {
      name: 'firefox',
      testMatch: /.*public.*\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['global setup'],
    },
    {
      name: 'webkit',
      testMatch: /.*public.*\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
      dependencies: ['global setup'],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
