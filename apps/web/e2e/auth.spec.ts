import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

test.describe('Authentication Flow', () => {
  test('should redirect unauthenticated users to sign-in', async ({ page }) => {
    // Setup Clerk testing token to bypass bot detection
    await setupClerkTestingToken({ page })
    
    // Try to access a protected route
    await page.goto('/dashboard')
    
    // Should be redirected to sign-in or onboarding
    await expect(page).toHaveURL(/sign-in|onboarding/)
  })

  test('should show sign-in page', async ({ page }) => {
    await setupClerkTestingToken({ page })
    
    await page.goto('/sign-in')
    
    // Check for sign-in elements
    await expect(page.locator('h1, h2')).toContainText(/sign in|login/i)
  })

  test('should show sign-up page', async ({ page }) => {
    await setupClerkTestingToken({ page })
    
    await page.goto('/sign-up')
    
    // Check for sign-up elements
    await expect(page.locator('h1, h2')).toContainText(/sign up|register|create account/i)
  })

  test('should sign in with Clerk helper', async ({ page }) => {
    await setupClerkTestingToken({ page })
    
    // Navigate to an unprotected page that loads Clerk
    await page.goto('/')
    
    // Ensure Clerk has loaded
    await clerk.loaded({ page })
    
    // Sign in using test credentials
    // Note: This requires E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD env vars
    if (process.env.E2E_CLERK_USER_USERNAME && process.env.E2E_CLERK_USER_PASSWORD) {
      await clerk.signIn({
        page,
        signInParams: {
          strategy: 'password',
          identifier: process.env.E2E_CLERK_USER_USERNAME,
          password: process.env.E2E_CLERK_USER_PASSWORD,
        },
      })
      
      // Navigate to a protected page
      await page.goto('/dashboard')
      
      // Verify we're authenticated (not redirected to sign-in)
      await expect(page).not.toHaveURL(/sign-in/)
    } else {
      test.skip()
    }
  })

  test('should sign out with Clerk helper', async ({ page }) => {
    await setupClerkTestingToken({ page })
    
    await page.goto('/')
    await clerk.loaded({ page })
    
    // Sign in first
    if (process.env.E2E_CLERK_USER_USERNAME && process.env.E2E_CLERK_USER_PASSWORD) {
      await clerk.signIn({
        page,
        signInParams: {
          strategy: 'password',
          identifier: process.env.E2E_CLERK_USER_USERNAME,
          password: process.env.E2E_CLERK_USER_PASSWORD,
        },
      })
      
      // Verify we're signed in
      await page.goto('/dashboard')
      await expect(page).not.toHaveURL(/sign-in/)
      
      // Sign out
      await page.goto('/')
      await clerk.signOut({ page })
      
      // Try to access protected page - should redirect
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/sign-in|onboarding/)
    } else {
      test.skip()
    }
  })
})
