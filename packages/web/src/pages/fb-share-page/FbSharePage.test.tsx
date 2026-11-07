import type { ReactNode } from 'react'

import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FbSharePage } from './FbSharePage'

const account = vi.hoisted(() => ({ handle: undefined as string | undefined }))

vi.mock('@audius/common/api', () => ({
  useCurrentAccountUser: () => ({ data: account.handle })
}))

vi.mock('@audius/common/utils', () => ({
  route: { SIGN_IN_PAGE: '/signin', PRIVACY_POLICY: '/legal/privacy-policy' }
}))

vi.mock('@audius/harmony', () => ({
  Text: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  Button: ({ children }: { children: ReactNode }) => <>{children}</>,
  IconFacebook: () => null
}))

vi.mock('services/env', () => ({
  env: {
    PUBLIC_HOSTNAME: 'audius.co',
    FACEBOOK_APP_ID: '3438219622966374'
  }
}))

describe('Facebook profile sharing', () => {
  beforeEach(() => {
    account.handle = undefined
  })

  it('offers login and a public privacy policy before authentication', () => {
    const html = renderToStaticMarkup(<FbSharePage />)
    expect(html).toContain('href="/signin"')
    expect(html).toContain('href="/legal/privacy-policy"')
    expect(html).not.toContain('facebook.com/dialog/share')
  })

  it('renders a share link when account data becomes available without an SDK', () => {
    renderToStaticMarkup(<FbSharePage />)
    account.handle = 'review_account'
    const html = renderToStaticMarkup(<FbSharePage />)
    const href = html.match(/href="(https:\/\/www.facebook.com[^"]+)"/)?.[1]
    expect(href).toBeDefined()
    const url = new URL(href!.replaceAll('&amp;', '&'))
    expect(url.pathname).toBe('/dialog/share')
    expect(url.searchParams.get('app_id')).toBe('3438219622966374')
    expect(url.searchParams.get('href')).toBe(
      'https://audius.co/review_account'
    )
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://audius.co/fb/share'
    )
    expect(html).toContain('Share to Facebook')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('href="/legal/privacy-policy"')
    expect(html).not.toContain('<script')
  })
})
