import { getContext } from '@audius/common/store'
import { Action } from 'redux'
import { eventChannel } from 'redux-saga'
import { select, put, take, delay } from 'redux-saga/effects'

import { getLocationPathname } from 'store/routing/selectors'

import { isElectron } from './clientUtil'

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

export function* visibilityPollingDaemon(action: Action) {
  const visibilityChannel = createVisibilityChangeChannel()
  while (true) {
    yield take(visibilityChannel)
    yield put(action)
  }
}
