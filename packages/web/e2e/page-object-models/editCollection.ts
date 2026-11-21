import path from 'path'

import { expect, type Locator, type Page } from '@playwright/test'

export class EditAlbumPage {
  private readonly artwork: Locator
  private readonly artworkButton: Locator
  private readonly dropzoneFileInput: Locator
  private readonly titleInput: Locator
  private readonly descriptionInput: Locator
  private readonly priceAndAudienceButton: Locator
  private readonly saveChangesButton: Locator

  constructor(page: Page) {
    this.artworkButton = page.getByRole('button', { name: /artwork$/i })
    this.dropzoneFileInput = page
      .getByTestId('upload-dropzone')
      .locator('input[type=file]')
    this.titleInput = page.getByRole('textbox', { name: /album name/i })
    this.descriptionInput = page.getByRole('textbox', {
      name: /album description/i
    })
    this.priceAndAudienceButton = page.getByRole('button', {
      name: /price & audience/i
    })
    this.saveChangesButton = page.getByRole('button', { name: /save changes/i })
    this.artwork = page.getByLabel(/artwork preview/)
  }

  async setTitle(title: string) {
    await this.titleInput.fill(title)
  }

  async setDescription(description: string) {
    await this.descriptionInput.fill(description)
  }

  async setArtwork(file: string) {
    await expect(this.artworkButton).toBeVisible()
    if (await this.artworkButton.filter({ hasText: 'remove' }).isVisible()) {
      await this.artworkButton.click()
    }
    await this.artworkButton.click()
    await this.dropzoneFileInput.setInputFiles(
      path.join(__dirname, '..', 'files', file)
    )
    await this.dropzoneFileInput.page().getByLabel('close popup').click()
    await this.artwork
      .getByRole('progressbar')
      .waitFor({ state: 'hidden', timeout: 30_000 })
  }

  async openPriceAndAudienceModal() {
    await this.priceAndAudienceButton.click()
  }

  async save() {
    await this.saveChangesButton.click()
  }
}
