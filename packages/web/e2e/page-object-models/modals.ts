import path from 'path'

import { Locator, Page } from '@playwright/test'

export class StemsAndDownloadsModal {
  public readonly locator: Locator

  private readonly trackDownloadInput: Locator
  private readonly dropzoneFileInput: Locator
  private readonly saveButton: Locator

  constructor(page: Page) {
    this.locator = page.getByRole('dialog', {
      name: /stems & downloads/i
    })
    this.trackDownloadInput = this.locator.getByRole('checkbox', {
      name: /allow full track download/i
    })
    this.dropzoneFileInput = this.locator
      .getByTestId('upload-dropzone')
      .locator('input[type=file]')
    this.saveButton = this.locator.getByRole('button', { name: /save/i })
  }

  async setAllowTrackDownload(allow: boolean) {
    if (allow) {
      await this.trackDownloadInput.check()
    } else {
      await this.trackDownloadInput.uncheck()
    }
  }

  async setStems(files: Array<{ filename: string; type?: string } | string>) {
    await this.dropzoneFileInput.setInputFiles(
      files.map((file) =>
        path.join(
          __dirname,
          '..',
          'files',
          typeof file === 'string' ? file : file.filename
        )
      )
    )
    for (const file of files) {
      if (typeof file === 'string' || !file.type) {
        continue
      }
      await this.locator
        .getByRole('listitem')
        .filter({ hasText: file.filename })
        .getByRole('button', { name: /select type/i })
        .click()
      await this.locator
        .page()
        .getByRole('listbox', { name: /select type/i })
        .getByRole('option', { name: file.type })
        .click()
    }
  }

  async save() {
    await this.saveButton.click()
  }
}

export class AttributionModal {
  private readonly locator: Locator
  private readonly allowAttribution: Locator
  private readonly commercialUse: Locator
  private readonly derivativeWorks: Locator
  private readonly saveButton: Locator

  constructor(page: Page) {
    this.locator = page.getByRole('dialog', { name: /attribution/i })
    this.allowAttribution = this.locator.getByRole('radiogroup', {
      name: /allow attribution/i
    })
    this.commercialUse = this.locator.getByRole('radiogroup', {
      name: /commercial use/i
    })
    this.derivativeWorks = this.locator.getByRole('radiogroup', {
      name: /derivative works/i
    })
    this.saveButton = this.locator.getByRole('button', { name: /save/i })
  }

  async markAsAIGenerated(user: string) {
    await this.locator
      .getByRole('checkbox', {
        name: /mark this track as ai generated/i
      })
      .click()
    await this.locator.getByRole('combobox', { name: /find users/i }).fill(user)
    // This option is mounted to the page
    await this.locator.page().getByRole('option', { name: user }).click()
  }

  async setISRC(isrc: string) {
    await this.locator.getByRole('textbox', { name: /isrc/i }).fill(isrc)
  }

  async setISWC(iswc: string) {
    await this.locator.getByRole('textbox', { name: /iswc/i }).fill(iswc)
  }

  async setAllowAttribution(allow: boolean) {
    if (allow) {
      await this.allowAttribution
        .getByRole('radio', { name: /allow attribution/i })
        .check({ force: true }) // segmented control
    } else {
      await this.allowAttribution
        .getByRole('radio', { name: /no attribution/i })
        .check({ force: true }) // segmented control
    }
  }

  async setAllowCommercialUse(allow: boolean) {
    if (allow) {
      await this.commercialUse
        .getByRole('radio', { name: /^commercial use/i })
        .check({ force: true }) // segmented control
    } else {
      await this.commercialUse
        .getByRole('radio', { name: /non-commercial use/i })
        .check({ force: true }) // segmented control
    }
  }

  async setDerivativeWorks(
    permission: 'Not-Allowed' | 'Share-Alike' | 'Allowed'
  ) {
    await this.derivativeWorks
      .getByRole('radio', { name: permission, exact: true })
      .check({ force: true }) // segmented control
  }

  async save() {
    await this.saveButton.click()
  }
}

type VisibleDetail = 'Genre' | 'Mood' | 'Tags' | 'Share Button' | 'Play Count'
export class PriceAndAudienceModal {
  public readonly locator: Locator
  public readonly remixAlert: Locator

  private readonly radioGroup: Locator
  private readonly visibleTrackDetails: Locator
  private readonly priceInput: Locator
  private readonly previewSecondsInput: Locator
  private readonly saveButton: Locator

  constructor(page: Page) {
    this.locator = page.getByRole('dialog', {
      name: /price & audience/i
    })
    this.remixAlert = this.locator
      .getByRole('alert')
      .first()
      .getByText('this track is marked as a remix')
    this.radioGroup = this.locator.getByRole('radiogroup', {
      name: /price & audience/i
    })
    this.visibleTrackDetails = this.radioGroup.getByRole('group', {
      name: /visible track details/i
    })
    this.priceInput = this.radioGroup.getByRole('textbox', {
      name: /cost to unlock/i
    })
    this.previewSecondsInput = this.radioGroup.getByRole('textbox', {
      name: /start time/i
    })
    this.saveButton = this.locator.getByRole('button', { name: /save/i })
  }

  async save() {
    await this.saveButton.click()
  }

  async setHidden(visibleDetails: Partial<Record<VisibleDetail, boolean>>) {
    await this.radioGroup.getByRole('radio', { name: /hidden/i }).check()
    for (const name of Object.keys(visibleDetails)) {
      const checkbox = this.visibleTrackDetails.getByRole('checkbox', { name })
      if (visibleDetails[name]) {
        await checkbox.check()
      } else {
        await checkbox.uncheck()
      }
    }
  }

  async setPremium({
    price,
    previewSeconds
  }: {
    price: string
    previewSeconds: string
  }) {
    await this.radioGroup
      .getByRole('radio', {
        name: /premium \(pay-to-unlock\)/i
      })
      .check()
    await this.priceInput.fill(price)
    await this.previewSecondsInput.fill(previewSeconds)
  }
}

export class RemixSettingsModal {
  public readonly locator: Locator

  constructor(page: Page) {
    this.locator = page.getByRole('dialog', {
      name: /remix settings/i
    })
  }

  async hideRemixes() {
    await this.locator
      .getByRole('checkbox', { name: /hide remixes of this track/i })
      .check()
  }

  async setAsRemixOf(remixUrl: string, remixTitle: string) {
    await this.locator
      .getByRole('checkbox', { name: /identify as remix/i })
      .check()
    await this.locator.getByRole('textbox').pressSequentially(remixUrl)
    const remixTrack = this.locator.getByText(remixTitle).first()
    await remixTrack.click()
  }

  async save() {
    await this.locator.getByRole('button', { name: /save/i }).click()
  }
}
