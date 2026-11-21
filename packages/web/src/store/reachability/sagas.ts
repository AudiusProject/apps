import {
  reachabilityActions,
  reachabilitySelectors,
  getContext
} from '@audius/common/store'
import { delay, race, put, all, take, select, call } from 'typed-redux-saga'

import { isMobileWeb } from 'common/utils/isMobileWeb'

const { getIsReachable } = reachabilitySelectors
const { setUnreachable, setReachable } = reachabilityActions

export const REACHABILITY_LONG_TIMEOUT = 10 * 1000
const REACHABILITY_SHORT_TIMEOUT = 5 * 1000
const REACHABILITY_REQUEST_TIMEOUT = 15 * 1000

const isResponseValid = (response: Response | undefined) =>
  response && response.ok

function* ping() {
  const { REACHABILITY_URL } = yield* getContext('env')
  if (!REACHABILITY_URL) {
    console.warn('No reachability url provided')
    return true
  }

  try {
    const { response } = yield* race({
      response: call(fetch, REACHABILITY_URL, { method: 'GET' }),
      timeout: delay(REACHABILITY_REQUEST_TIMEOUT)
    })

    if (isResponseValid(response)) {
      console.debug('Reachability call succeeded')
      return true
    }
    console.debug('Reachability call failed')
    return false
  } catch {
    console.debug('Reachability call failed')
    return false
  }
}

export function* waitForReachability() {
  const isReachable = yield* select(getIsReachable)
  if (isReachable !== false) return
  yield* all([take(reachabilityActions.SET_REACHABLE)])
}

export function* waitForConfirmedReachability() {
  const isReachable = yield* select(getIsReachable)
  if (isReachable === true) return
  yield* all([take(reachabilityActions.SET_REACHABLE)])
}

function* updateReachability(isReachable: boolean) {
  const wasReachable = yield* select(getIsReachable)
  if (isReachable) {
    if (!wasReachable) {
      console.warn('App transitioned to reachable state')
    }
    yield* put(setReachable())
  } else {
    if (wasReachable) {
      console.warn('App transitioned to unreachable state')
    }
    yield* put(setUnreachable())
  }
}

function* reachabilityPollingDaemon() {
  if (!isMobileWeb()) {
    yield* put(setReachable())
    return
  }

  let failures = 0
  while (true) {
    const isReachable = yield* call(ping)
    if (!isReachable) failures += 1
    if (isReachable) failures = 0
    yield* call(updateReachability, failures < 2)

    yield* delay(
      isReachable ? REACHABILITY_LONG_TIMEOUT : REACHABILITY_SHORT_TIMEOUT
    )
  }
}

export default function sagas() {
  return [reachabilityPollingDaemon]
}
