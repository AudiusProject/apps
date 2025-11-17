import { test, expect } from '@playwright/test'

test('auths, fetches tracks, and favorites a track', async ({
  page,
  context
}) => {
  test.slow()

  // Set entropy so we don't need to do OTP
  const entropy = process.env.CREATE_AUDIUS_APP_TEST_ENTROPY ?? ''
  await context.addInitScript((entropy) => {
    // Set entropy for both audius.co (OAuth) and localhost (app)
    window.localStorage.setItem('hedgehog-entropy-key', entropy)
  }, entropy)

  await page.goto('localhost:4173')

  const pagePromise = context.waitForEvent('page')
  await page.getByRole('button', { name: 'Continue With Audius' }).click()

  // Oauth popup
  const authPage = await pagePromise
  await authPage.waitForLoadState()
  await authPage.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByText('Continue With Audius')).not.toBeVisible({
    timeout: 10000
  })

  // Fetch tracks
  await page.getByRole('textbox').fill('createaudiusapptracks')
  await page.getByRole('button', { name: 'Get Tracks' }).click()

  // Set up block_confirmation response listener
  // The SDK makes requests to relay and then polls block_confirmation
  const responsePromise = page.waitForResponse((response) => {
    return (
      response.url().includes('block_confirmation') && response.status() === 200
    )
  })

  const favoriteButton = page
    .getByRole('button', { name: 'Favorite', exact: true })
    .first()
  const unfavoriteButton = page
    .getByRole('button', { name: 'Unfavorite', exact: true })
    .first()

  // Either favorite or unfavorite the track
  const favoriteButtonExists = await Promise.any([
    favoriteButton.waitFor().then(() => true),
    unfavoriteButton.waitFor().then(() => false)
  ]).catch(() => {
    throw 'Missing button'
  })

  if (favoriteButtonExists) {
    await favoriteButton.click()
    await expect(unfavoriteButton).toBeVisible()
  } else {
    await unfavoriteButton.click()
    await expect(favoriteButton).toBeVisible()
  }

  // Confirm track is updated
  await responsePromise
})
