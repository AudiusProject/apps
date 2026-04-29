import { call, put, takeEvery } from 'typed-redux-saga'

import { getContext } from '~/store/effects'

import { actions as playbackActions } from './slice'
import { PLAYBACK_RATE_LS_KEY, PlaybackRate } from './types'

// Restore the user's saved playback rate on app load.
function* setInitialPlaybackRate() {
  const remoteConfigInstance = yield* getContext('remoteConfigInstance')
  yield* call(remoteConfigInstance.waitForRemoteConfig)

  const getLocalStorageItem = yield* getContext('getLocalStorageItem')
  const playbackRate = yield* call(getLocalStorageItem, PLAYBACK_RATE_LS_KEY)
  const rate: PlaybackRate = (playbackRate as PlaybackRate | null) ?? '1x'
  yield* put(playbackActions.setPlaybackRate({ rate }))
}

// Persist playback-rate changes so the user keeps their preferred speed.
function* watchSetPlaybackRate() {
  const setLocalStorageItem = yield* getContext('setLocalStorageItem')
  yield* takeEvery(
    playbackActions.setPlaybackRate.type,
    function* (action: ReturnType<typeof playbackActions.setPlaybackRate>) {
      const { rate } = action.payload
      setLocalStorageItem(PLAYBACK_RATE_LS_KEY, rate)
    }
  )
}

export const sagas = () => [setInitialPlaybackRate, watchSetPlaybackRate]
