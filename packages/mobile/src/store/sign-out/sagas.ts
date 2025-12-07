import { Name } from '@audius/common/models'
import {
  accountActions,
  tokenDashboardPageActions,
  feedPageLineupActions,
  signOutActions,
  searchActions,
  getContext
} from '@audius/common/store'
import { waitForValue } from '@audius/common/utils'
import { setupBackend } from '@audius/web/src/common/store/backend/actions'
import { getIsSettingUp } from '@audius/web/src/common/store/backend/selectors'
import { resetSignOn } from '@audius/web/src/common/store/pages/signon/actions'
import { make } from 'common/store/analytics/actions'
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
  yield* put(make(Name.SETTINGS_LOG_OUT, {}))
  const authService = yield* getContext('authService')
  const queryClient = yield* getContext('queryClient')

  // Wait for in-flight set up to resolve
  yield* call(waitForValue, getIsSettingUp, {}, (isSettingUp) => !isSettingUp)

  yield* put(resetAccount())
  yield* put(feedPageLineupActions.reset())

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
  // NOTE: Weird workaround here - queryClient.clear() is necessary to delete all of the cache
  // HOWEVER, this does NOT trigger a rerender on any active queries.
  // So we need to call resetQueries() to trigger a rerender and then clear the cache.
  queryClient.resetQueries()
  queryClient.clear() // ORDER MATTERS HERE - clear() must be called after resetQueries()
  // On web we reload the page to get the app into a state
  // where it is acting like first-load. On mobile, in order to
  // get the same behavior, call to set up the backend again,
  // which will discover that we have no account
  yield* put(setupBackend())
}

function* watchSignOut() {
  yield* takeLatest(signOutAction.type, signOut)
}

export default function sagas() {
  return [watchSignOut]
}
