import { expectSaga } from 'redux-saga-test-plan'
import * as matchers from 'redux-saga-test-plan/matchers'
import { describe, it, vitest } from 'vitest'

import { getWalletAccountSaga } from '~/api'
import { AccountUserMetadata } from '~/models'

import { fetchAccountAsync } from './sagas'
import { fetchAccountFailed, fetchAccountSucceeded, signedIn } from './slice'

const wallet = '0xc12f8e8a40b90e5aedf58fb729fa543e9a020cb0'

const makeAccount = (isDeactivated: boolean) =>
  ({
    user: {
      user_id: 1,
      handle: 'test',
      name: 'Test',
      is_deactivated: isDeactivated
    },
    playlists: [],
    playlist_library: { contents: [] },
    track_save_count: 0
  }) as unknown as AccountUserMetadata

const runFetchAccount = (account: AccountUserMetadata) => {
  const sdk = {
    services: {
      audiusWalletClient: {
        getAddresses: vitest.fn().mockResolvedValue([wallet])
      }
    }
  }

  return expectSaga(fetchAccountAsync, {
    shouldMarkAccountAsLoading: true
  }).provide([
    [matchers.getContext('audiusSdk'), vitest.fn().mockResolvedValue(sdk)],
    [matchers.getContext('audiusBackendInstance'), {}],
    [matchers.getContext('remoteConfigInstance'), { setUserId: vitest.fn() }],
    [
      matchers.getContext('localStorage'),
      {
        getAudiusUserWalletOverride: vitest.fn().mockResolvedValue(null),
        getItem: vitest.fn().mockResolvedValue(null),
        setAudiusAccount: vitest.fn(),
        setAudiusAccountUser: vitest.fn()
      }
    ],
    [
      matchers.getContext('queryClient'),
      { setQueryData: vitest.fn(), getQueryData: vitest.fn() }
    ],
    [matchers.call.fn(getWalletAccountSaga), account]
  ])
}

describe('fetchAccountAsync', () => {
  // Regression test: the deactivated branch used to fall through to
  // fetchAccountSucceeded/signedIn, so a deactivated user was signed back in
  // on any app load despite the sign-in form rejecting them.
  it('does not sign in a deactivated account', async () => {
    await runFetchAccount(makeAccount(true))
      .put(fetchAccountFailed({ reason: 'ACCOUNT_DEACTIVATED' }))
      .not.put.actionType(fetchAccountSucceeded.type)
      .not.put.actionType(signedIn.type)
      .silentRun()
  })
})
