import fs from 'fs'

import { expect } from '@playwright/test'

import { getUser } from './data'
import { test as setup } from './test'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
  const authFileExists = fs.existsSync('playwright/.auth/user.json')
  if (authFileExists && !process.env.CLEAN) {
    console.info(
      'Authentication file already exists and CLEAN is not true, skipping authentication.'
    )
    return
  }

  const user = getUser()
  const base64Entropy = btoa(user.entropy.trim())
  await page.goto(`/feed?login=${base64Entropy}`)
  await expect(page.getByText(user.name)).toBeVisible({
    timeout: 15000
  })
  await page.evaluate(() => {
    localStorage.setItem('HAS_REQUESTED_BROWSER_PUSH_PERMISSION', 'true')
  })
  await page.context().storageState({ path: authFile })
})
