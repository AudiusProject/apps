import { getContext } from '@audius/common/store'
import { Action } from 'redux'
import { eventChannel } from 'redux-saga'
import { select, put, take, delay } from 'redux-saga/effects'

import { getLocationPathname } from 'store/routing/selectors'

import { isElectron } from './clientUtil'

/**
 * Starts a polling daemon that triggers an action once every delay period if the tab/app is in the foreground/focus
 * @param action The action to "fire" when poll triggers
 * @param defaultDelayTimeMs the default time to wait between polls
 * @param customDelayTimeConfig a config that maps pathnames to delay times for custom delays depending on what page the user is on
 */
export function* foregroundPollingDaemon(
  action: Action,
  defaultDelayTimeMs: number,
  customDelayTimeConfig?: Record<string, number>
) {
  const isNativeMobile = yield* getContext('isNativeMobile')

  let isBrowserInBackground = false
  const handleVisibilityChange = () => {
    isBrowserInBackground = document.hidden
  }
  if (!isNativeMobile) {
    document.addEventListener('visibilitychange', handleVisibilityChange, false)
  }

  try {
    while (true) {
      if (!isBrowserInBackground || isElectron() || isNativeMobile) {
        yield put(action)
      }
      if (customDelayTimeConfig && !isNativeMobile) {
        const currentRoute: string = yield select(getLocationPathname)
        if (customDelayTimeConfig[currentRoute]) {
          yield delay(customDelayTimeConfig[currentRoute])
        } else {
          yield delay(defaultDelayTimeMs)
        }
      } else {
        yield delay(defaultDelayTimeMs)
      }
    }
  } finally {
    if (!isNativeMobile) {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
        false
      )
    }
  }
}

function createVisibilityChangeChannel() {
  return eventChannel((emitter) => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        emitter(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  })
}

/**
 * A polling daemon that triggers an action every time the tab/app is brought back into focus
 * @param action The action to "fire" when triggered
 */
export function* visibilityPollingDaemon(action: Action) {
  const visibilityChannel = createVisibilityChangeChannel()
  while (true) {
    yield take(visibilityChannel)
    yield put(action)
  }
}
