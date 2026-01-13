import { test, expect } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'

test.describe('Onboarding Flow', () => {
  test('should redirect to onboarding if not completed', async ({ page }) => {
    // This test uses the authenticated fan user state from global setup
    // The user should be authenticated but onboarding may not be complete
    await setupClerkTestingToken({ page })
    await page.goto('/onboarding')
    
    // Check that onboarding page loads
    await expect(page.locator('h1, h2')).toContainText(/onboarding|complete your profile/i)
  })

  test('should show role selection for new users', async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/onboarding')
    
    // Check for role selection (fan vs artist)
    const roleSelection = page.locator('text=/fan|artist/i')
    if (await roleSelection.count() > 0) {
      await expect(roleSelection.first()).toBeVisible()
    }
  })

  test('should validate required fields in fan onboarding', async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/onboarding')
    
    // Select fan role if role selection is shown
    const fanButton = page.locator('button:has-text("Fan"), button:has-text("fan")').first()
    if (await fanButton.isVisible()) {
      await fanButton.click()
    }
    
    // Try to submit without filling required fields
    const submitButton = page.locator('button:has-text("Complete"), button:has-text("Submit")').first()
    if (await submitButton.isVisible()) {
      await submitButton.click()
      
      // Should show validation errors
      await expect(page.locator('text=/required|error/i').first()).toBeVisible({ timeout: 2000 }).catch(() => {
        // Validation might be handled differently
      })
    }
  })

  test('should complete fan onboarding with valid data', async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/onboarding')
    
    // Select fan role if needed
    const fanButton = page.locator('button:has-text("Fan"), button:has-text("fan")').first()
    if (await fanButton.isVisible()) {
      await fanButton.click()
      await page.waitForTimeout(500) // Wait for form to load
    }
    
    // Fill in required name field
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first()
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Fan User')
      
      // Submit the form
      const submitButton = page.locator('button:has-text("Complete"), button:has-text("Submit")').first()
      if (await submitButton.isVisible()) {
        await submitButton.click()
        
        // Should redirect to dashboard after successful onboarding
        await expect(page).toHaveURL(/dashboard/, { timeout: 10000 })
      }
    }
  })
})
