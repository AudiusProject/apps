import { expect } from '@playwright/test'

import { getTrack } from './data'
import {
  RemixSettingsModal,
  TrackPriceAndAudienceModal,
  AdvancedModal,
  StemsAndDownloadsModal,
  VisibilityModal
} from './page-object-models/modals'
import {
  EditTrackPage,
  UploadFinishPage,
  UploadSelectPage
} from './page-object-models/upload'
import { test, waitForUser } from './test'
import { openCleanBrowser } from './utils'

test('should upload a track', async ({ page }) => {
  const trackTitle = `Test track ${Date.now()}`
  const genre = 'Alternative'

  await page.goto('upload')
  await waitForUser(page)

  const selectPage = new UploadSelectPage(page)
  await selectPage.setTracks('track.mp3')
  await selectPage.continue()

  const editPage = new EditTrackPage(page)
  await editPage.setArtwork('track-artwork.jpeg')
  await editPage.setTitle(trackTitle)
  await editPage.setGenre(genre)

  await editPage.complete()

  const uploadingPage = new UploadFinishPage(page, 'Track')
  await uploadingPage.assertCompletes()

  await page.getByRole('link', { name: /visit track page/i }).click()

  const trackHeading = page.getByRole('heading', {
    name: trackTitle,
    level: 1
  })
  await expect(trackHeading).toBeVisible()
})

test('should upload a remix hidden track', async ({ page }) => {
  const { title, permalink } = getTrack()
  const trackTitle = `Test track ${Date.now()}`
  const trackDescription = 'Test description'
  const genre = 'Alternative'
  const mood = 'Easygoing'
  const tags = ['TAG1', 'TAG2']
  const remixUrl = `audius.co${permalink}`
  const remixName = title
  const isrc = 'US-123-45-67890'
  const iswc = 'T-123456789-0'

  await page.goto('upload')
  await waitForUser(page)

  const selectPage = new UploadSelectPage(page)
  await selectPage.setTracks('track.mp3')
  await selectPage.continue()

  await expect(
    page.getByRole('heading', { name: /complete your track/i, level: 1 })
  ).toBeVisible()

  const editPage = new EditTrackPage(page)
  await editPage.setArtwork('track-artwork.jpeg')
  await editPage.setTitle(trackTitle)
  await editPage.setDescription(trackDescription)
  await editPage.setGenre(genre)
  await editPage.setMood(mood)
  await editPage.setTags(tags)

  await editPage.openRemixSettings()
  const remixSettingsModal = new RemixSettingsModal(page)
  await remixSettingsModal.setAsRemixOf(remixUrl, remixName)
  await remixSettingsModal.save()

  await editPage.openPriceAndAudienceSettings()
  const priceAndAudienceModal = new TrackPriceAndAudienceModal(page)
  expect(priceAndAudienceModal.remixAlert).toBeVisible()
  await expect(
    priceAndAudienceModal.locator.getByRole('radio', { disabled: false })
  ).toHaveCount(1)
  await priceAndAudienceModal.save()

  await editPage.openVisibilitySettings()
  const visibilitySettingsModal = new VisibilityModal(page)
  await visibilitySettingsModal.setHidden()
  await visibilitySettingsModal.save()

  await editPage.openAttributionSettings()
  const attributionModal = new AdvancedModal(page)
  await attributionModal.setISRC(isrc)
  await attributionModal.setISWC(iswc)
  await attributionModal.setAllowAttribution(true)
  await attributionModal.setAllowCommercialUse(true)
  await attributionModal.setDerivativeWorks('Allowed')
  await attributionModal.save()

  await editPage.complete()

  const uploadingPage = new UploadFinishPage(page, 'Track')
  await uploadingPage.assertCompletes()

  await page.getByRole('link', { name: /visit track page/i }).click()

  const trackHeading = page.getByRole('heading', {
    name: trackTitle,
    level: 1
  })
  await expect(trackHeading).toBeVisible()

  const makePublicButton = page.getByRole('button', { name: /make public/i })
  await expect(makePublicButton.first()).toBeVisible()

  const tag1 = page.getByRole('link', { name: tags[0] })
  await expect(tag1).toBeVisible()
  const tag2 = page.getByRole('link', { name: tags[1] })
  await expect(tag1).toBeVisible()
  await expect(tag2).toBeVisible()

  const description = page.getByRole('heading', {
    name: trackDescription,
    level: 3
  })
  await expect(description).toBeVisible()

  await expect(page.getByRole('link', { name: genre })).toBeVisible()
  await expect(page.getByRole('link', { name: mood })).toBeVisible()

  await expect(page.getByRole('button', { name: /share/i })).toBeVisible()

  await expect(page.getByText('ORIGINAL TRACK')).toBeVisible()
  await expect(page.getByRole('link', { name: remixName })).toBeVisible()

  // Assert ISRC
  // TODO

  // Assert ISWC
  // TODO

  // Assert license
  // TODO
})

test('should upload a premium track', async ({ page, browser }) => {
  const trackTitle = `Test premium track ${Date.now()}`
  const genre = 'Alternative'
  const price = '1.05'
  const previewSeconds = '15'

  await page.goto('upload')
  await waitForUser(page)

  const selectPage = new UploadSelectPage(page)
  await selectPage.setTracks('track.mp3')
  await selectPage.continue()

  const editPage = new EditTrackPage(page)
  await editPage.setArtwork('track-artwork.jpeg')
  await editPage.setTitle(trackTitle)
  await editPage.setGenre(genre)

  await editPage.openPriceAndAudienceSettings()
  const priceAndAudienceModal = new TrackPriceAndAudienceModal(page)
  await priceAndAudienceModal.setPremium({ price, previewSeconds })
  await priceAndAudienceModal.save()

  await editPage.complete()

  const uploadingPage = new UploadFinishPage(page, 'Track')
  await uploadingPage.assertCompletes()

  await page.getByRole('link', { name: /visit track page/i }).click()

  const trackHeading = page.getByRole('heading', {
    name: trackTitle,
    level: 1
  })
  await expect(trackHeading).toBeVisible()

  const premium = page.getByRole('heading', {
    name: /premium track/i,
    level: 5
  })
  await expect(premium.first()).toBeVisible()

  await expect(page.getByText('$' + price)).toBeVisible()

  const trackUrl = page.url()

  const newPage = await openCleanBrowser({ browser })
  const buyButton = newPage.getByRole('button', { name: /buy/i })
  newPage.goto(trackUrl)
  await expect(buyButton).toBeVisible({ timeout: 20_000 })
  await expect(newPage.getByText('$' + price)).toBeVisible()
})

test('should upload a track with free stems', async ({ page }) => {
  const trackTitle = `Test stems track ${Date.now()}`
  const genre = 'Alternative'

  await page.goto('upload')
  await waitForUser(page)

  const selectPage = new UploadSelectPage(page)
  await selectPage.setTracks('track.mp3')
  await selectPage.continue()

  const editPage = new EditTrackPage(page)
  await editPage.setArtwork('track-artwork.jpeg')
  await editPage.setTitle(trackTitle)
  await editPage.setGenre(genre)

  await editPage.openStemsAndDownloadsSettings()
  const stemsAndDownloadsModal = new StemsAndDownloadsModal(page)
  await stemsAndDownloadsModal.setAllowTrackDownload(true)
  await stemsAndDownloadsModal.setStems([
    { filename: 'stem-1.mp3', type: 'Instrumental' },
    { filename: 'stem-2.mp3', type: 'Lead Vocals' }
  ])
  await stemsAndDownloadsModal.save()

  await editPage.complete()

  const uploadingPage = new UploadFinishPage(page, 'Track')
  await uploadingPage.assertCompletes()

  await page.getByRole('link', { name: /visit track page/i }).click()

  const trackHeading = page.getByRole('heading', {
    name: trackTitle,
    level: 1
  })
  await expect(trackHeading).toBeVisible()

  await page.getByRole('button', { name: /stems & downloads/i }).click()
  const fullTrackRow = page.getByRole('row').filter({ hasText: /full track/i })
  const instrumentalRow = page
    .getByRole('row')
    .filter({ hasText: /instrumental/i })
  const leadVocalsRow = page
    .getByRole('row')
    .filter({ hasText: /lead vocals/i })
  await expect(fullTrackRow).toBeVisible()
  await expect(
    fullTrackRow.getByRole('button', { name: /download stem/i })
  ).toBeEnabled()
  await expect(instrumentalRow).toBeVisible()
  await expect(instrumentalRow.getByText(/stem-1.*?\.mp3/i)).toBeVisible()
  await expect(
    instrumentalRow.getByRole('button', { name: /download stem/i })
  ).toBeEnabled()
  await expect(leadVocalsRow).toBeVisible()
  await expect(leadVocalsRow.getByText(/stem-2.*?\.mp3/i)).toBeVisible()
  await expect(
    leadVocalsRow.getByRole('button', { name: /download stem/i })
  ).toBeEnabled()
})
