import { expect } from '@playwright/test'

import { getEditableAlbum } from './data'
import { EditAlbumPage } from './page-object-models/editCollection'
import { CollectionPriceAndAudienceModal } from './page-object-models/modals'
import { test } from './test'
import { waitForConfirmation } from './utils'

test('should persist collection edits', async ({ page }) => {
  const { permalink } = getEditableAlbum()

  const newTitle = 'EDITED TITLE'
  const newDescription = 'EDITED DESCRIPTION'
  const newPrice = '$1.23'

  await page.goto(permalink)
  await page
    .getByRole('link', { name: /edit album/i })
    .click({ timeout: 20_000 })
  const editAlbumPage = new EditAlbumPage(page)

  await editAlbumPage.setArtwork('track-artwork.jpeg')
  await editAlbumPage.setTitle(newTitle)
  await editAlbumPage.setDescription(newDescription)

  await editAlbumPage.openPriceAndAudienceModal()
  const priceAndAudienceModal = new CollectionPriceAndAudienceModal(page)
  await priceAndAudienceModal.setPremium({ price: newPrice })
  await priceAndAudienceModal.save()

  try {
    await page.getByRole('button', { name: /update audience/i }).click()
  } catch (e) {
    if (e.name !== 'TimeoutError') {
      throw e
    }
  }

  const confirmationPromise = waitForConfirmation(page)
  await editAlbumPage.save()

  await expect(
    page.getByRole('heading', { name: newTitle, level: 1 })
  ).toBeVisible({ timeout: 30 * 1000 })

  await expect(page.getByText(newDescription)).toBeVisible()

  await expect(page.getByText(/premium album/i)).toBeVisible()

  await expect(page.getByText(newPrice)).toBeVisible()

  await confirmationPromise
  await page.reload()

  await expect(
    page.getByRole('heading', { name: newTitle, level: 1 })
  ).toBeVisible({ timeout: 30_000 })

  await expect(page.getByText(newDescription)).toBeVisible()

  await expect(page.getByText(/premium album/i)).toBeVisible()

  await expect(page.getByText(newPrice)).toBeVisible()
})
