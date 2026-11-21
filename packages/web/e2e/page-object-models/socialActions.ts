import { Locator, Page, expect } from '@playwright/test'

import { waitForConfirmation } from '../utils'

export class SocialActions {
  private readonly page: Page
  public readonly favoriteButton: Locator
  public readonly unfavoriteButton: Locator
  public readonly repostButton: Locator
  public readonly unrepostButton: Locator

  constructor(page: Page) {
    this.page = page
    const trackActions = page.getByRole('group', {
      name: /track actions/i
    })
    this.favoriteButton = trackActions.getByRole('button', {
      name: /favorite$/i
    })
    this.unfavoriteButton = trackActions.getByRole('button', {
      name: /favorited$/i
    })
    this.repostButton = trackActions.getByRole('button', {
      name: /repost$/i
    })
    this.unrepostButton = trackActions.getByRole('button', {
      name: /reposted$/i
    })
  }

  async favorite() {
    const confirmationPromise = waitForConfirmation(this.page)

    await this.favoriteButton.click()

    await confirmationPromise
    await this.page.reload()

    await expect(this.unfavoriteButton).toBeVisible()
  }

  async unfavorite() {
    const confirmationPromise = waitForConfirmation(this.page)

    await this.unfavoriteButton.click()

    await confirmationPromise
    await this.page.reload()

    await expect(this.favoriteButton).toBeVisible()
  }

  async repost() {
    const confirmationPromise = waitForConfirmation(this.page)

    await this.repostButton.click()

    await confirmationPromise
    await this.page.reload()

    await expect(this.unrepostButton).toBeVisible()
  }

  async unrepost() {
    const confirmationPromise = waitForConfirmation(this.page)

    await this.unrepostButton.click()

    await confirmationPromise
    await this.page.reload()

    await expect(this.repostButton).toBeVisible()
  }
}
