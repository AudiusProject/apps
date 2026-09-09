import path from 'path'

import { Page, expect, devices } from '@playwright/test'

import { test } from './test'
import { resetAuthState, generateTestUser } from './utils'

type User = {
  email: string
}

async function expectSignUpPage(page: Page) {
  await page.waitForURL(/signup/i)
  await expect(
    page.getByRole('heading', { name: /sign up for audius/i, level: 1 })
  ).toBeVisible()
}

async function assertOnCreatePasswordPage(user: User, page: Page) {
  await expect(
    page.getByRole('heading', { name: /create your password/i })
  ).toBeVisible()

  await expect(
    page.getByText(/Create a password that's secure and easy to remember./i)
  ).toBeVisible()

  await expect(page.getByText(/your email/i)).toBeVisible()
  await expect(page.getByText(user.email)).toBeVisible()
}

async function testSignUp({
  isMobile = false,
  testUser = generateTestUser(),
  signUpUrl = 'signup',
  page
}: {
  isMobile?: boolean
  testUser?: ReturnType<typeof generateTestUser>
  signUpUrl?: string
  page: Page
}) {
  const { email, password, handle, name } = testUser

  // --> Load signup route
  await page.goto(signUpUrl)
  await expect(
    page.getByRole('heading', { name: /sign up for audius/i, level: 1 })
  ).toBeVisible({ timeout: 45000 })

  await page.getByRole('button', { name: /sign up free/i }).click()

  // --> Email Page
  await page.getByRole('textbox', { name: /email/i }).fill(email)
  await page.getByRole('button', { name: /sign up free/i }).click()

  await assertOnCreatePasswordPage(testUser, page)

  // --> Password Page
  // Password inputs dont have a role, so we just check against label text
  // https://github.com/testing-library/dom-testing-library/issues/567#issue-616906804
  await page.getByLabel(/^password/i).fill(password)
  await page.waitForTimeout(500)
  await page.getByLabel(/confirm password/i).fill(password)

  await page.getByRole('button', { name: /continue/i }).click()

  // --> Pick Handle Page
  await expect(
    page.getByRole('heading', { name: /pick your handle/i })
  ).toBeVisible()
  await expect(
    page.getByText(/this is how others find and tag you/i)
  ).toBeVisible()
  await page.getByRole('textbox', { name: /handle/i }).fill(handle)
  await page.getByRole('button', { name: /continue/i }).click()

  // --> Finish Profile Page
  await expect(
    page.getByRole('heading', { name: /finish your profile/i })
  ).toBeVisible()
  await expect(
    page.getByText(/your photos & display name is how others see you./i)
  ).toBeVisible()

  // upload cover & profile photo
  // await page
  //   .getByRole('button', { name: /upload a cover photo for your profile/i })
  //   .click()
  // await page
  //   .getByTestId('coverPhoto-dropzone')
  //   .locator('input')
  //   .setInputFiles(path.join(__dirname, 'files/cover-photo.jpeg'))

  await page.getByRole('button', { name: /upload a profile photo/i }).click()
  await page
    .getByTestId('profileImage-dropzone')
    .locator('input')
    .setInputFiles(path.join(__dirname, 'files/profile-picture.jpeg'))

  await page.getByRole('textbox', { name: /display name/i }).fill(name)
  await page.getByRole('button', { name: /continue/i }).click()

  // --> Select Genres Page
  await expect(
    page.getByRole('heading', { name: /select your genres/i })
  ).toBeVisible()
  await expect(
    page.getByText(/start by picking some of your favorite genres./i)
  ).toBeVisible()

  await expect(page.getByText(name)).toBeVisible()
  await expect(page.getByText(`@${handle}`)).toBeVisible()

  const genres = [/^acoustic/i, /^pop/i, /^lo-fi/i, /^electronic/i]

  for (const genre of genres) {
    await page.getByRole('checkbox', { name: genre }).check()
  }

  await page.getByRole('button', { name: /continue/i }).click()

  // --> Select Artists Page
  await expect(
    page.getByRole('heading', { name: /follow at least 3 artists/i })
  ).toBeVisible()
  await expect(
    page.getByText(/curate your feed with tracks uploaded/i)
  ).toBeVisible()

  const genreGroup = page.getByRole('radiogroup', { name: /genre/i })
  await expect(
    genreGroup.getByRole('radio', { name: /featured/i })
  ).toBeVisible()

  for (const genre of genres) {
    expect(await genreGroup.getByRole('radio', { name: genre })).toBeVisible()
  }

  async function selectArtist(sectionName: RegExp) {
    const artistGroup = page.getByRole('group', { name: sectionName })
    await artistGroup.getByRole('checkbox', { checked: false }).first().click()
  }

  // Check if featuredArtist is visible,
  // If not, it's likely we are in a dev environment without any artists set
  // in which case we can skip this step
  const featuredArtist = page.getByRole('group', {
    name: /pick featured artists/
  })

  await expect(featuredArtist)
    .toBeVisible()
    .catch(() => {})

  if (await featuredArtist.isVisible()) {
    // Pick a featured artist
    await selectArtist(/pick featured artists/i)

    // Pick an artist from each genre we selected
    await page.getByRole('radio', { name: /acoustic/i }).click()
    await selectArtist(/pick acoustic artists/i)

    await page.getByRole('radio', { name: /electronic/i }).click()
    await selectArtist(/pick electronic artists/i)
  }

  await page.getByRole('button', { name: /continue/i }).click()

  // --> Mobile CTA page (desktop web only)
  if (!isMobile) {
    await page.getByRole('heading', { name: /get the app/i }).click()
    await expect(page.getByText(/take audius with you/i)).toBeVisible()
    await page.getByRole('button', { name: /continue/i }).click()
  }

  // --> Welcome modal page
  await expect(
    page.getByRole('dialog', {
      name: /welcome to audius/i
    })
  ).toBeVisible({ timeout: 60000 }) // This can take a long time
  await page.getByRole('button', { name: /start listening/i }).click()
  await expect(page).toHaveURL(/trending/i)
}

test.describe('Sign Up', () => {
  // Resets auth state for this suite so we aren't already signed in
  test.use(resetAuthState)
  test.describe('desktop', () => {
    test('can navigate to signup from trending', async ({ page }) => {
      await page.goto('trending')
      await expect(page.getByText(/have an account\?/i)).toBeVisible()
      await page.getByRole('link', { name: /sign up/i }).click()
      await expectSignUpPage(page)
    })

    test('/signup goes to sign-up', async ({ page }) => {
      await page.goto('signup')
      await expectSignUpPage(page)
    })

    test('can navigate to sign-up from sign-in', async ({ page }) => {
      await page.goto('signin')
      await page.getByRole('link', { name: /create an account/i }).click()

      await expectSignUpPage(page)
    })

    test('can navigate to sign-up from the public site', async ({ page }) => {
      await page.goto('')
      await page.getByRole('link', { name: /sign up/i }).click()
      await expectSignUpPage(page)
    })

    test('should go through whole sign up flow', async ({ page }) => {
      await testSignUp({
        isMobile: false,
        page
      })
    })

    test.fixme('should sign up from a referral', async ({ page }) => {
      await testSignUp({
        isMobile: true,
        signUpUrl: `/signup?ref=dejayjdstaging`,
        page
      })
      await page
        .getByRole('button', { name: /toggle navigation menu/i })
        .click()
      await page.getByRole('menuitem', { name: /rewards/i }).click()
      await expect(page.getByText(/you accepted an invite/i)).toBeVisible()
    })
  })

  test.describe('mobile', () => {
    test.use({ viewport: devices['iPhone X'].viewport })

    test('can navigate to signup from trending', async ({ page }) => {
      await page.goto('trending')
      await page.getByRole('link', { name: /sign up/i }).click()
      await expectSignUpPage(page)
    })

    test('/signup goes to sign-up', async ({ page }) => {
      await page.goto('signup')
      await expectSignUpPage(page)
    })

    test('can navigate to sign-up from sign-in', async ({ page }) => {
      await page.goto('signin')
      await page.getByRole('link', { name: /create an account/i }).click()

      await expectSignUpPage(page)
    })

    test('can navigate to sign-up from the public site', async ({ page }) => {
      await page.goto('')
      await page.getByRole('button', { name: /open nav menu/i }).click()
      await page.getByRole('link', { name: /sign up/i }).click()

      await expectSignUpPage(page)
    })
    test('should go through whole sign up flow', async ({ page }) => {
      await testSignUp({ isMobile: true, page })
    })
    test.fixme('should sign up from a referral', async ({ page }) => {
      await testSignUp({
        isMobile: true,
        signUpUrl: `/signup?ref=dejayjdstaging`,
        page
      })
      // TODO: this is the desktop flow, need to figure out how to get mobile view to properly show
      await page
        .getByRole('button', { name: /toggle navigation menu/i })
        .click()
      await page.getByRole('menuitem', { name: /rewards/i }).click()
      await expect(page.getByText(/you accepted an invite/i)).toBeVisible()

      // TODO: this is the mobile flow that we would expect to use
      // await page.getByRole('link', { name: /profile page/i }).click()
      // await page.getByRole('button', { name: /audio rewards/i }).click()
      // await page.getByText(/you accepted an invite/i).scrollIntoViewIfNeeded()
      // await expect(page.getByText(/you accepted an invite/i)).toBeVisible()
    })
  })
})
