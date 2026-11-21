import {
  accountActions,
  reachabilityActions,
  reachabilitySelectors,
  getContext
} from '@audius/common/store'
import {
  put,
  all,
  take,
  takeEvery,
  select,
  call,
  race,
  delay
} from 'typed-redux-saga'

import { REACHABILITY_LONG_TIMEOUT } from 'store/reachability/sagas'

import * as backendActions from './actions'
import { getIsSettingUp, getIsSetup } from './selectors'

const { getIsReachable } = reachabilitySelectors

export function* waitForBackendSetup() {
  const isBackendSetup = yield* select((store) => store.backend.isSetup)
  const isReachable = yield* select(getIsReachable)
  if (!isBackendSetup && !isReachable) {
    yield* all([
      take(backendActions.SETUP_BACKEND_SUCCEEDED),
      take(reachabilityActions.SET_REACHABLE)
    ])
  } else if (!isReachable) {
    yield* take(reachabilityActions.SET_REACHABLE)
  } else if (!isBackendSetup) {
    yield* take(backendActions.SETUP_BACKEND_SUCCEEDED)
  }
}

function* awaitReachability() {
  const isNativeMobile = yield* getContext('isNativeMobile')
  const isReachable = yield* select(getIsReachable)
  if (isReachable || !isNativeMobile) return true
  const { action } = yield* race({
    action: take(reachabilityActions.SET_REACHABLE),
    delay: delay(REACHABILITY_LONG_TIMEOUT)
  })
  return !!action
}

function* setupBackend() {
  yield* put(accountActions.fetchLocalAccount())

  const establishedReachability = yield* call(awaitReachability)
  if (!establishedReachability) {
    console.warn('No internet connectivity')

    yield* put(accountActions.fetchAccountNoInternet())
    yield* take(reachabilityActions.SET_REACHABLE)
    console.info('Reconnected')
  }

  yield* put(accountActions.fetchAccount({ shouldMarkAccountAsLoading: false }))

  const isReachable = yield* select(getIsReachable)
  if (!isReachable) return
  yield* put(backendActions.setupBackendSucceeded())
}

function* watchSetupBackend() {
  yield* takeEvery(backendActions.SETUP, setupBackend)
}

function* setupBackendIfNotSetUp() {
  const isSetup = yield* select(getIsSetup)
  const isSettingUp = yield* select(getIsSettingUp)
  if (!isSetup && !isSettingUp) {
    yield* put(backendActions.setupBackend())
  }
}

function* watchSetReachable() {
  yield* takeEvery(reachabilityActions.SET_REACHABLE, setupBackendIfNotSetUp)
}

function* init() {
  yield* put(backendActions.setupBackend())
}

export default function sagas() {
  return [init, watchSetupBackend, watchSetReachable]
}
