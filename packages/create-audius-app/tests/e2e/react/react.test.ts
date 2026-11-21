import { test, expect } from '@playwright/test'

test('auth and fetches tracks', async ({ page, context }) => {
  test.slow()

  const entropy = process.env.CREATE_AUDIUS_APP_TEST_ENTROPY ?? ''
  await context.addInitScript((entropy) => {
    if (window.location.hostname === 'audius.co') {
      window.localStorage.setItem('hedgehog-entropy-key', entropy)
    }
  }, entropy)

  await page.goto('localhost:4173')

  const pagePromise = context.waitForEvent('page')
  await page.getByRole('button', { name: 'Continue With Audius' }).click()

  const authPage = await pagePromise
  await authPage.waitForLoadState()
  await authPage.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByText('Continue With Audius')).not.toBeVisible({
    timeout: 10000
  })

  await page.getByRole('textbox').fill('createaudiusapptracks')

  const responsePromise = page.waitForResponse(async (response) => {
    if (response.url().includes('v1/users/4zZ9aV9/tracks')) {
      const json = await response.json()
      return json.data
    }
  })

  await page.getByRole('button', { name: 'Get Tracks' }).click()

  await responsePromise
})
