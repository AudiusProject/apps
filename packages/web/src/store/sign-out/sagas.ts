import { Name } from '@audius/common/models'
import { TRENDING_PAGE } from '@audius/common/src/utils/route'
import {
  accountActions,
  signOutActions,
  getContext
} from '@audius/common/store'
import { disconnect } from '@wagmi/core'
import { takeLatest, put, call } from 'redux-saga/effects'

import { wagmiAdapter } from 'app/ReownAppKitModal'
import { make } from 'common/store/analytics/actions'
import { signOut } from 'store/sign-out/signOut'
import { push } from 'utils/navigation'
const { resetAccount, unsubscribeBrowserPushNotifications } = accountActions
const { signOut: signOutAction } = signOutActions

// Use synchronous accessor - by the time saga runs, ReownProvider should be initialized
const getWagmiConfig = () => wagmiAdapter.wagmiConfig

function* watchSignOut() {
  const localStorage = yield* getContext('localStorage')
  const authService = yield* getContext('authService')
  const queryClient = yield* getContext('queryClient')
  yield takeLatest(
    signOutAction.type,
    function* (action: ReturnType<typeof signOutAction>) {
      const wagmiConfig = getWagmiConfig()
      if (wagmiConfig.state.status === 'connected') {
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
