import { route } from '@audius/common/utils'
import { describe, expect, it } from 'vitest'

import { getSignOnRoute } from './getSignOnRoute'
import { Pages } from './types'

const {
  SIGN_IN_PAGE,
  SIGN_UP_FINISH_PROFILE_PAGE,
  SIGN_UP_HANDLE_PAGE,
  SIGN_UP_PASSWORD_PAGE
} = route

describe('getSignOnRoute', () => {
  it('routes Identity-only accounts to handle selection', () => {
    expect(
      getSignOnRoute({
        signIn: false,
        page: Pages.PROFILE,
        hasHandle: false
      })
    ).toBe(SIGN_UP_HANDLE_PAGE)
  })

  it('routes indexed incomplete accounts to profile completion', () => {
    expect(
      getSignOnRoute({
        signIn: false,
        page: Pages.PROFILE,
        hasHandle: true
      })
    ).toBe(SIGN_UP_FINISH_PROFILE_PAGE)
  })

  it('preserves the guest password resume route', () => {
    expect(
      getSignOnRoute({
        signIn: false,
        page: Pages.PASSWORD,
        hasHandle: true
      })
    ).toBe(SIGN_UP_PASSWORD_PAGE)
  })

  it('routes sign-in requests to sign in regardless of page state', () => {
    expect(
      getSignOnRoute({
        signIn: true,
        page: Pages.PROFILE,
        hasHandle: true
      })
    ).toBe(SIGN_IN_PAGE)
  })
})
