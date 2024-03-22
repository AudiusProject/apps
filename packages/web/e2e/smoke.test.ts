import { test, expect } from '@playwright/test'

test('should load an album page', async ({ page }) => {
  await page.goto('df/album/probers_album_do_not_delete-512', {
    waitUntil: 'load'
  })
  const heading = page.getByRole('heading', {
    name: 'probers_album_do_not_delete',
    level: 1
  })
  await expect(heading).toBeAttached({ timeout: 10000 })
})

test('should load the feed page', async ({ page }) => {
  await page.goto('feed', { waitUntil: 'load' })
  const heading = page.getByRole('heading', { name: 'Your Feed', level: 1 })
  await expect(heading).toBeAttached({ timeout: 10000 })
})

test('should load a playlist page', async ({ page }) => {
  await page.goto('df/playlist/probers_playlist_do_not_delete-511', {
    waitUntil: 'load'
  })
  const heading = page.getByRole('heading', {
    name: 'PROBERS_PLAYLIST_DO_NOT_DELETE'
  })
  await expect(heading).toBeAttached({ timeout: 10000 })
})

test('should load a remix page', async ({ page }) => {
  await page.goto('df/probers_remix_do_not_delete-2859', { waitUntil: 'load' })
  const heading = page.getByRole('heading', {
    name: 'probers_remix_do_not_delete'
  })
  await expect(heading).toBeAttached({ timeout: 10000 })
})

test('should load a remixes page', async ({ page }) => {
  await page.goto('mb430/traektoria-source-2217/remixes', { waitUntil: 'load' })
  const heading = page.getByRole('heading', { name: 'Remixes', level: 1 })
  await expect(heading).toBeAttached({ timeout: 10000 })
})

test('should load a track page', async ({ page }) => {
  await page.goto('sebastian12/bachgavotte-1', { waitUntil: 'load' })
  const heading = page.getByRole('heading', {
    name: 'probers_track_do_not_delete',
    level: 1
  })
  await expect(heading).toBeAttached({ timeout: 15000 })
})

test('should load trending page', async ({ page }) => {
  await page.goto('trending', { waitUntil: 'load' })
  const heading = page.getByRole('heading', {
    name: 'Trending',
    level: 1
  })
  await expect(heading).toBeVisible({ timeout: 10000 })
})

test('should load upload page', async ({ page }) => {
  await page.goto(`upload`, { waitUntil: 'load' })
  const heading = page.getByRole('heading', {
    name: 'Upload Your Music',
    level: 1
  })
  await expect(heading).toBeVisible({ timeout: 10000 })
})
