import {
  accountActions,
  tokenDashboardPageActions,
  signOutActions,
  searchActions,
  getContext
} from '@audius/common/store'
import { waitForValue } from '@audius/common/utils'
import { setupBackend } from '@audius/web/src/common/store/backend/actions'
import { getIsSettingUp } from '@audius/web/src/common/store/backend/selectors'
import { resetSignOn } from '@audius/web/src/common/store/pages/signon/actions'
import { takeLatest, put, call } from 'typed-redux-saga'

import {
  ENTROPY_KEY,
  SEARCH_HISTORY_KEY,
  THEME_STORAGE_KEY
} from 'app/constants/storage-keys'
import { localStorage } from 'app/services/local-storage'

import { clearOfflineDownloads } from '../offline-downloads/slice'
import { deregisterPushNotifications } from '../settings/sagas'

const { resetAccount } = accountActions
const { resetState: resetWalletState } = tokenDashboardPageActions
const { clearHistory } = searchActions
const { signOut: signOutAction } = signOutActions

const storageKeysToRemove = [THEME_STORAGE_KEY, ENTROPY_KEY, SEARCH_HISTORY_KEY]

function* signOut() {
  const authService = yield* getContext('authService')
  const queryClient = yield* getContext('queryClient')

  yield* call(waitForValue, getIsSettingUp, {}, (isSettingUp) => !isSettingUp)

  yield* put(resetAccount())

  yield* put(clearHistory())
  yield* put(clearOfflineDownloads())
  yield* put(resetWalletState())
  yield* put(resetSignOn())

  yield* call(deregisterPushNotifications)
  yield* call([localStorage, 'clearAudiusUserWalletOverride'])
  yield* call([localStorage, 'clearAudiusAccount'])
  yield* call([localStorage, 'clearAudiusAccountUser'])
  yield* call([authService, authService.signOut])
  for (const storageKey of storageKeysToRemove) {
    yield* call([localStorage, 'removeItem'], storageKey)
  }
  queryClient.resetQueries()
  queryClient.clear()
  yield* put(setupBackend())
}

function* watchSignOut() {
  yield* takeLatest(signOutAction.type, signOut)
}

export default function sagas() {
  return [watchSignOut]
}
