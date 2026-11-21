import { TRENDING_PAGE } from '@audius/common/src/utils/route'
import {
  accountActions,
  signOutActions,
  getContext
} from '@audius/common/store'
import { takeLatest, put, call } from 'redux-saga/effects'

import { getLoadedAppKit } from 'app/appkit'
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
      const wagmiConfig = getLoadedAppKit()?.wagmiAdapter.wagmiConfig
      if (wagmiConfig && wagmiConfig.state.status === 'connected') {
        const { disconnect } = yield call(() => import('@wagmi/core'))
        yield call(disconnect, wagmiConfig)
      }
      yield put(resetAccount())
      queryClient.resetQueries()
      queryClient.clear()
      yield put(unsubscribeBrowserPushNotifications())
      signOut(localStorage, authService)
      if (!action?.payload?.fromOAuth) {
        yield put(push(TRENDING_PAGE))
      }
    }
  )
}

export default function sagas() {
  return [watchSignOut]
}
