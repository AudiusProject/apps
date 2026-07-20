import { Pages } from '@audius/web/src/common/store/pages/signon/types'

import { getSignOnScreen } from './getSignOnScreen'

describe('getSignOnScreen', () => {
  it('routes Identity-only accounts to handle selection', () => {
    expect(getSignOnScreen({ page: Pages.PROFILE, hasHandle: false })).toBe(
      'PickHandle'
    )
  })

  it('routes indexed incomplete accounts to profile completion', () => {
    expect(getSignOnScreen({ page: Pages.PROFILE, hasHandle: true })).toBe(
      'FinishProfile'
    )
  })

  it('preserves the guest password resume screen', () => {
    expect(getSignOnScreen({ page: Pages.PASSWORD, hasHandle: true })).toBe(
      'CreatePassword'
    )
  })

  it('ignores sign-on states without a native transition', () => {
    expect(getSignOnScreen({ page: Pages.EMAIL, hasHandle: false })).toBeNull()
  })
})
