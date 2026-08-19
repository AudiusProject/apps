import { Name } from '@audius/common/models'
import { TRENDING_PAGE } from '@audius/common/src/utils/route'
import {
  accountActions,
  signOutActions,
  getContext
} from '@audius/common/store'
import { disconnect } from '@wagmi/core'
import { takeLatest, put, call } from 'redux-saga/effects'

import { getLoadedAppKit } from 'app/appkit'
import { make } from 'common/store/analytics/actions'
import { signOut } from 'store/sign-out/signOut'
import { push } from 'utils/navigation'
const { resetAccount, unsubscribeBrowserPushNotifications } = accountActions
const { signOut: signOutAction } = signOutActions

function* watchSignOut() {
  const localStorage = yield* getContext('localStorage')
  const authService = yield* getContext('authService')
  const queryClient = yield* getContext('queryClient')
  yield takeLatest(
    signOutAction.type,
    function* (action: ReturnType<typeof signOutAction>) {
      // Only reachable if AppKit was loaded, which only happens once a wallet
      // is actually in play — if it never loaded there is nothing to disconnect.
      const wagmiConfig = getLoadedAppKit()?.wagmiAdapter.wagmiConfig
      if (wagmiConfig && wagmiConfig.state.status === 'connected') {
        yield call(disconnect, wagmiConfig)
      }
      yield put(resetAccount())
      // NOTE: Weird workaround here - queryClient.clear() is necessary to delete all of the cache
      // HOWEVER, this does NOT trigger a rerender on any active queries.
      // So we need to call resetQueries() to trigger a rerender and then clear the cache.
      queryClient.resetQueries()
      queryClient.clear() // ORDER MATTERS HERE - clear() must be called after resetQueries()
      yield put(unsubscribeBrowserPushNotifications())
      yield put(
        make(Name.SETTINGS_LOG_OUT, {
          callback: () => signOut(localStorage, authService)
        })
      )
      if (!action?.payload?.fromOAuth) {
        yield put(push(TRENDING_PAGE))
      }
    }
  )
}

export default function sagas() {
  return [watchSignOut]
}
