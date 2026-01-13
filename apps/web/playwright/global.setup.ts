import { clerk, clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'
import path from 'path'

// Configure Playwright with Clerk
// This must be run serially if Playwright is configured to run fully parallel
setup.describe.configure({ mode: 'serial' })

setup('global setup', async ({}) => {
  await clerkSetup()
})

// Define the path to the storage file
const authFile = path.join(__dirname, '.clerk/user.json')

// Authenticate and save state for different user roles
setup('authenticate fan user', async ({ page }) => {
  // Navigate to an unprotected page that loads Clerk
  await page.goto('/')

  // Sign in using test credentials from environment variables
  // For development, you can use phone_code or email_code strategies
  // Make sure to set E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD in your .env
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: process.env.E2E_CLERK_USER_USERNAME || process.env.E2E_CLERK_FAN_EMAIL || '',
      password: process.env.E2E_CLERK_USER_PASSWORD || process.env.E2E_CLERK_FAN_PASSWORD || '',
    },
  })

  // Verify authentication by accessing a protected page
  await page.goto('/dashboard')
  
  // Wait for a page element that indicates successful authentication
  // Adjust selector based on your actual dashboard implementation
  await page.waitForSelector('body', { timeout: 5000 })

  // Save the authenticated state
  await page.context().storageState({ path: authFile })
})

// Optional: Create separate auth states for different user roles
const artistAuthFile = path.join(__dirname, '.clerk/artist.json')

setup('authenticate artist user', async ({ page }) => {
  await page.goto('/')

  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: process.env.E2E_CLERK_ARTIST_EMAIL || process.env.E2E_CLERK_USER_USERNAME || '',
      password: process.env.E2E_CLERK_ARTIST_PASSWORD || process.env.E2E_CLERK_USER_PASSWORD || '',
    },
  })

  await page.goto('/artist-dashboard')
  await page.waitForSelector('body', { timeout: 5000 })

  await page.context().storageState({ path: artistAuthFile })
})

// Optional: Create auth state for admin/writer users
const adminAuthFile = path.join(__dirname, '.clerk/admin.json')

setup('authenticate admin user', async ({ page }) => {
  await page.goto('/')

  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: process.env.E2E_CLERK_ADMIN_EMAIL || process.env.E2E_CLERK_USER_USERNAME || '',
      password: process.env.E2E_CLERK_ADMIN_PASSWORD || process.env.E2E_CLERK_USER_PASSWORD || '',
    },
  })

  await page.goto('/admin')
  await page.waitForSelector('body', { timeout: 5000 })

  await page.context().storageState({ path: adminAuthFile })
})
