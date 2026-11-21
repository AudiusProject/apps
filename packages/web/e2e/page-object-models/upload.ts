import path from 'path'

import { Locator, Page, expect } from '@playwright/test'

class BaseTrackEditPage {
  protected readonly artworkButton: Locator
  protected readonly dropzoneFileInput: Locator
  protected readonly titleInput: Locator
  protected readonly genreBox: Locator
  protected readonly genreList: Locator
  protected readonly moodBox: Locator
  protected readonly moodList: Locator
  protected readonly tagsInput: Locator
  protected readonly descriptionInput: Locator
  protected readonly completeButton: Locator

  constructor(page: Page) {
    this.artworkButton = page.getByRole('button', { name: /artwork$/i })
    this.dropzoneFileInput = page
      .getByTestId('upload-dropzone')
      .locator('input[type=file]')
    this.genreBox = page.getByRole('combobox', { name: /pick a genre/i })
    this.genreList = page
      .getByLabel(/pick a genre/i)
      .locator('.rc-virtual-list')
    this.moodBox = page.getByRole('combobox', { name: /pick a mood/i })
    this.moodList = page.getByLabel(/pick a mood/i).locator('.rc-virtual-list')
    this.tagsInput = page.getByRole('textbox', { name: /tags/i })
    this.descriptionInput = page.getByRole('textbox', { name: /description/i })
    this.completeButton = page.getByRole('button', { name: /complete upload/i })
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
  }

  async setTitle(title: string) {
    await this.titleInput.fill(title)
  }

  async setGenre(genre: string) {
    await this.genreBox.fill(genre)
    await this.genreList.getByRole('option', { name: genre }).click()
  }

  async setMood(mood: string) {
    await this.moodBox.fill(mood)
    await this.moodList.getByRole('option', { name: mood }).click()
  }

  async setTags(tags: string[]) {
    for (const tag of tags) {
      await this.tagsInput.fill(tag)
      await this.tagsInput.press('Enter')
    }
  }

  async setDescription(description: string) {
    await this.descriptionInput.fill(description)
  }

  async complete() {
    await this.completeButton.click()
    const confirmUploadModal = this.completeButton.page().getByRole('dialog', {
      name: /confirm upload/i
    })
    await expect(confirmUploadModal).toBeVisible()
    await confirmUploadModal.getByRole('button', { name: /upload/i }).click()
  }
}

export class EditTrackPage extends BaseTrackEditPage {
  protected readonly titleInput: Locator
  private readonly remixSettingsButton: Locator
  private readonly priceAndAudienceSettingsButton: Locator
  private readonly advancedSettingsButton: Locator
  private readonly stemsAndDownloadsSettingsButton: Locator
  private readonly visibilitySettingsButton: Locator

  constructor(page: Page) {
    super(page)
    this.titleInput = page.getByRole('textbox', { name: /track name/i })
    this.remixSettingsButton = page.getByRole('button', {
      name: /remix settings/i
    })
    this.priceAndAudienceSettingsButton = page.getByRole('button', {
      name: /price & audience/i
    })
    this.advancedSettingsButton = page.getByRole('button', {
      name: /advanced/i
    })
    this.stemsAndDownloadsSettingsButton = page.getByRole('button', {
      name: /stems & downloads/i
    })
    this.visibilitySettingsButton = page.getByRole('button', {
      name: /visibility/i
    })
  }

  async openRemixSettings() {
    await this.remixSettingsButton.click()
  }

  async openPriceAndAudienceSettings() {
    await this.priceAndAudienceSettingsButton.click()
  }

  async openAttributionSettings() {
    await this.advancedSettingsButton.click()
  }

  async openStemsAndDownloadsSettings() {
    await this.stemsAndDownloadsSettingsButton.click()
  }

  async openVisibilitySettings() {
    await this.visibilitySettingsButton.click()
  }
}

export class EditPlaylistPage extends BaseTrackEditPage {
  protected readonly titleInput: Locator
  protected readonly trackList: Locator

  constructor(page: Page) {
    super(page)
    this.titleInput = page.getByRole('textbox', { name: /playlist name/i })
    this.trackList = page.getByRole('list', { name: /track list/i })
  }

  async setTrackName(index: number, name: string) {
    const trackItem = this.trackList.getByRole('listitem').nth(index)
    const nameInput = trackItem.getByRole('textbox', { name: /track name/i })
    await nameInput.fill(name)
  }

  async setTrackDetails(
    index: number,
    {
      name,
      genre,
      mood,
      tags
    }: {
      name?: string
      genre?: string
      mood?: string
      tags?: string[]
    }
  ) {
    const trackItem = this.trackList.getByRole('listitem').nth(index)
    const checkbox = trackItem.getByRole('checkbox', {
      name: /override details for this track/i
    })
    if (genre || mood || tags) {
      await checkbox.check()
    }
    if (name) {
      await this.setTrackName(index, name)
    }
    if (genre) {
      await this.setTrackGenre(index, genre)
    }
    if (mood) {
      await this.setTrackMood(index, mood)
    }
    if (tags) {
      await this.addTrackTags(index, tags)
    }
  }

  private async setTrackGenre(index: number, genre: string) {
    const trackItem = this.trackList.getByRole('listitem').nth(index)
    const genreBox = trackItem.getByRole('combobox', { name: /pick a genre/i })
    const genreList = genreBox
      .page()
      .getByLabel(/pick a genre/i)
      .locator('.rc-virtual-list')
    await genreBox.fill(genre)
    await genreList.getByRole('option', { name: genre }).click()
  }

  private async setTrackMood(index: number, mood: string) {
    const trackItem = this.trackList.getByRole('listitem').nth(index)
    const moodBox = trackItem.getByRole('combobox', { name: /pick a mood/i })
    const moodList = moodBox
      .page()
      .getByLabel(/pick a mood/i)
      .locator('.rc-virtual-list')
    await moodBox.fill(mood)
    await moodList.getByRole('option', { name: mood }).click()
  }

  private async addTrackTags(index: number, tags: string[]) {
    const trackItem = this.trackList.getByRole('listitem').nth(index)
    const tagsInput = trackItem.getByRole('textbox', { name: /tags/i })
    for (const tag of tags) {
      await tagsInput.fill(tag)
      await tagsInput.press('Enter')
    }
  }
}

type AlbumAccessType = 'public' | 'premium' | 'hidden'
type AlbumAccessArgs = { albumPrice: number; albumTrackPrice: number }
export class UploadEditAlbumPage extends EditPlaylistPage {
  protected readonly titleInput: Locator
  protected readonly priceAndAudienceMenu: Locator
  protected readonly albumPriceInput: Locator
  protected readonly albumTrackPriceInput: Locator
  protected readonly accessMenuSaveButton: Locator
  protected readonly accessPriceDisplay: Locator
  protected readonly accessTrackPriceDisplay: Locator
  protected readonly accessAndSaleMenuOptions: {
    [k in AlbumAccessType]: Locator
  }

  protected readonly downloadToggle: Locator

  constructor(page: Page) {
    super(page)
    this.titleInput = page.getByRole('textbox', { name: /album name/i })
    this.priceAndAudienceMenu = page.getByRole('heading', {
      name: /price & audience/i
    })
    this.accessAndSaleMenuOptions = {
      public: page.getByRole('radio', { name: /public/i }),
      premium: page.getByRole('radio', { name: /premium/i }),
      hidden: page.getByRole('radio', { name: /hidden/i })
    }
    this.albumPriceInput = page.getByRole('textbox', { name: /album price/i })
    this.albumTrackPriceInput = page.getByRole('textbox', {
      name: /track price/i
    })
    this.accessMenuSaveButton = page.getByRole('button', {
      name: /save/i
    })
    this.accessTrackPriceDisplay = page.getByTestId('track-price-display')
    this.accessPriceDisplay = page.getByTestId('price-display')
    this.downloadToggle = page.getByRole('checkbox', {
      name: /Full Track Download/i
    })
  }

  async setAlbumAccessType(type: AlbumAccessType, args?: AlbumAccessArgs) {
    await this.priceAndAudienceMenu.click()
    await this.accessAndSaleMenuOptions[type].click()
    if (args !== undefined && type === 'premium' && 'albumPrice' in args) {
      await this.albumPriceInput.fill(args.albumPrice.toString())
      await this.albumTrackPriceInput.fill(args.albumTrackPrice.toString())
      await this.accessMenuSaveButton.click()
      await expect(this.accessPriceDisplay).toContainText(
        `$${args.albumPrice.toString()}.00`
      )
      await expect(this.accessTrackPriceDisplay).toContainText(
        `$${args.albumTrackPrice.toString()}.00`
      )
    } else {
      await this.accessMenuSaveButton.click()
    }
  }

  async toggleDownloadable() {
    await this.downloadToggle.click()
  }
}

export class UploadSelectPage {
  private readonly dropzoneFileInput: Locator
  private readonly releaseType: Locator
  private readonly continueButton: Locator

  constructor(page: Page) {
    this.dropzoneFileInput = page
      .getByTestId('upload-dropzone')
      .locator('input[type=file]')
    this.releaseType = page.getByRole('radiogroup', {
      name: /release type/i
    })
    this.continueButton = page.getByRole('button', {
      name: /continue uploading/i
    })
  }

  async setTracks(...files: string[]) {
    await this.dropzoneFileInput.setInputFiles(
      files.map((file) => path.join(__dirname, '..', 'files', file))
    )
  }

  async setReleaseType(type: 'Track' | 'Playlist' | 'Album') {
    await this.releaseType
      .getByRole('radio', { name: type })
      .check({ force: true })
  }

  async continue() {
    await this.continueButton.click()
  }
}

export class UploadFinishPage {
  private readonly progressBar: Locator
  private readonly uploadingHeading: Locator
  private readonly finalizing: Locator
  private readonly successHeading: Locator

  constructor(page: Page, type: 'Track' | 'Tracks' | 'Album' | 'Playlist') {
    this.progressBar = page.getByRole('progressbar', {
      name: /upload in progress/i
    })
    this.uploadingHeading = page.getByRole('heading', {
      name: `Uploading Your ${type}`
    })
    this.finalizing = page.getByText(/finalizing upload/i)
    this.successHeading = page.getByRole('heading', {
      name: /your upload is complete/i
    })
  }

  async assertCompletes() {
    await expect(this.uploadingHeading).toBeVisible()

    await this.assertProgress(1)
    await this.assertProgress(10)
    await this.assertProgress(20)
    await this.assertProgress(30)
    await this.assertProgress(40)
    await this.assertProgress(50)
    await this.assertProgress(60)
    await this.assertProgress(70)
    await this.assertProgress(80)
    await this.assertProgress(90)
    await this.assertProgress(99)

    await expect(this.finalizing).toBeVisible({ timeout: 60 * 1000 })

    await expect(this.successHeading).toBeVisible({ timeout: 60 * 1000 })
  }

  private async assertProgress(progress: number) {
    await expect
      .poll(
        async () =>
          Number(await this.progressBar.getAttribute('aria-valuenow')),
        { timeout: 60 * 1000 }
      )
      .toBeGreaterThanOrEqual(progress)
  }
}
