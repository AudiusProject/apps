import { expect, Page } from '@playwright/test'

import { test } from './test'
import { resetAuthState } from './utils'

test.describe('Sign In', () => {
  test.use(resetAuthState)

  test('can navigate to sign-in from trending screen', async ({ page }) => {
    await page.goto('trending')
    await page.getByRole('link', { name: /sign in/i }).click()
    await assertOnSignInPage(page)
  })

  test('/signin goes to sign-in', async ({ page }) => {
    await page.goto('signin')
    await expect(
      page.getByRole('heading', { name: 'Sign Into Audius' })
    ).toBeVisible()
  })

  test('can navigate to sign-in from sign-up', async ({ page }) => {
    await page.goto('signup')
    await expect(page.getByText(/already have an account?/i)).toBeVisible()
    await page.getByRole('link', { name: /Sign In/ }).click()
    await assertOnSignInPage(page)
  })

  test.skip('can navigate to sign-in after entering email in sign-up', async ({
    page
  }) => {
    await page.goto('signup')
    await page.getByRole('textbox', { name: /email/i }).fill(user.email)
    await page.getByRole('button', { name: /sign up free/i }).click()
    const signUpModal = page.getByRole('alert')
    await signUpModal.getByRole('link', { name: /Sign In/ }).click()
    await assertOnSignInPage(page)
  })

  test.skip('can sign in', async ({ page }) => {
    await page.goto('signin')
    await assertOnSignInPage(page)
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.click('button:has-text("Sign In")')
    await page.waitForSelector('text="Your Feed"', { timeout: 20000 })
    await expect(page).toHaveText(name)
    await expect(page).toHaveText(`@${handle}`)
  })
})

async function assertOnSignInPage(page: Page) {
  await expect(page.getByText(/sign into audius/i)).toBeVisible()
}
