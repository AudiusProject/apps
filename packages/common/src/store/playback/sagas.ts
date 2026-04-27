import { call, put, select, takeEvery, takeLatest } from 'typed-redux-saga'

import { Kind } from '~/models'
import { cacheActions } from '~/store/cache'
import { getContext } from '~/store/effects'
import { playerActions } from '~/store/player'
import { queueActions, queueSelectors, QueueSource } from '~/store/queue'
import { makeUid } from '~/utils/uid'

import * as playbackSelectors from './selectors'
import { actions as playbackActions } from './slice'
import type { PlaybackTrack } from './types'

const SHADOW_SUBSCRIBER = 'PLAYBACK_SHADOW'

const {
  getPlaybackQueue,
  getPlaybackIndex,
  getCurrentPlaybackTrack,
  getQuerySource,
  getIsPlaying: getPlaybackIsPlaying,
  getOvershot,
  getUndershot
} = playbackSelectors

// Map PlaybackTrack[] -> shadow queue entries for the legacy queue slice so
// PlayBar / now-playing UI continues to work unchanged. The legacy queue's
// source field is typed as QueueSource enum but is treated as an opaque
// string tag; casting is fine.
const buildShadowEntries = (tracks: PlaybackTrack[]) =>
  tracks.map((t) => ({
    id: t.trackId,
    uid: t.legacyUid ?? makeUid(Kind.TRACKS, t.trackId, t.source),
    source: t.source as unknown as QueueSource,
    playerBehavior: t.playerBehavior
  }))

// Sync the legacy queue slice to mirror the current playback queue + index.
// Kept in sync on playFrom / next / previous / playTrackAt so that selectors
// that still read from state.queue (PlayBar, NowPlayingDrawer, mobile UI)
// stay correct.
function* shadowToLegacyQueue(tracks: PlaybackTrack[], index: number) {
  const entries = buildShadowEntries(tracks)
  yield* put(queueActions.clear({}))
  yield* put(queueActions.add({ entries, index: 0 }))
  yield* put(queueActions.updateIndex({ index }))
  // If shuffle was enabled before any tracks were loaded (e.g. the
  // ShuffleButton restored shuffleState=ON from localStorage on mount,
  // dispatching queue/shuffle against an empty queue), the legacy queue's
  // shuffleOrder is empty. queue.add does not regenerate shuffleOrder by
  // design, so re-toggle shuffle here against the now-populated queue so
  // the legacy queue's shuffleIndex/shuffleOrder are valid. Without this
  // the next button overshoots immediately and the player resets+pauses.
  const queueShuffle = yield* select(queueSelectors.getShuffle)
  if (queueShuffle) {
    yield* put(queueActions.shuffle({ enable: true }))
  }
  yield* put(
    cacheActions.subscribe(
      Kind.TRACKS,
      entries.map((e) => ({ uid: SHADOW_SUBSCRIBER, id: e.id }))
    )
  )
}

// Issue a playerActions.play that loads+plays the current playback track.
function* playCurrent() {
  const current = yield* select(getCurrentPlaybackTrack)
  if (!current) return
  const queue = yield* select(getPlaybackQueue)
  const index = yield* select(getPlaybackIndex)
  const uid =
    current.legacyUid ?? makeUid(Kind.TRACKS, current.trackId, current.source)
  yield* put(queueActions.updateIndex({ index }))
  yield* put(
    playerActions.play({
      uid,
      trackId: current.trackId,
      onEnd: playbackActions.next,
      playerBehavior: current.playerBehavior
    })
  )
  // Auto-paginate when the queue is nearly exhausted.
  yield* call(maybePaginate, queue.length, index)
}

function* watchPlayFrom() {
  yield* takeLatest(playbackActions.playFrom.type, function* () {
    const queue = yield* select(getPlaybackQueue)
    const index = yield* select(getPlaybackIndex)
    if (queue.length === 0 || index < 0) return
    yield* call(shadowToLegacyQueue, queue, index)
    yield* call(playCurrent)
  })
}

function* watchPlayTrackAt() {
  yield* takeLatest(playbackActions.playTrackAt.type, function* () {
    yield* call(playCurrent)
  })
}

function* watchNext() {
  yield* takeEvery(playbackActions.next.type, function* () {
    const overshot = yield* select(getOvershot)
    if (overshot) {
      // End of queue, no repeat — stop playback rather than re-load
      // the same last track.
      yield* put(playerActions.reset({ shouldAutoplay: false }))
      return
    }
    const index = yield* select(getPlaybackIndex)
    if (index < 0) return
    yield* call(playCurrent)
  })
}

function* watchPrevious() {
  yield* takeEvery(playbackActions.previous.type, function* () {
    const undershot = yield* select(getUndershot)
    if (undershot) {
      yield* put(playerActions.reset({ shouldAutoplay: false }))
      return
    }
    const index = yield* select(getPlaybackIndex)
    if (index < 0) return
    yield* call(playCurrent)
  })
}

function* watchTogglePlay() {
  yield* takeLatest(playbackActions.togglePlay.type, function* () {
    // Reducer has already flipped playback.playing; reconcile the legacy
    // player to match.
    const shouldPlay = yield* select(getPlaybackIsPlaying)
    if (shouldPlay) {
      yield* put(playerActions.play({}))
    } else {
      yield* put(playerActions.pause({}))
    }
  })
}

function* watchPlay() {
  yield* takeLatest(playbackActions.play.type, function* () {
    yield* put(playerActions.play({}))
  })
}

function* watchPause() {
  yield* takeLatest(playbackActions.pause.type, function* () {
    yield* put(playerActions.pause({}))
  })
}

function* watchSeekTo() {
  yield* takeLatest(
    playbackActions.seekTo.type,
    function* (action: ReturnType<typeof playbackActions.seekTo>) {
      yield* put(playerActions.seek({ seconds: action.payload.seconds }))
    }
  )
}

function* watchSetPlaybackRate() {
  yield* takeLatest(
    playbackActions.setPlaybackRate.type,
    function* (action: ReturnType<typeof playbackActions.setPlaybackRate>) {
      yield* put(playerActions.setPlaybackRate({ rate: action.payload.rate }))
    }
  )
}

// Mirror legacy player state changes back into the playback slice so the
// playback slice stays consistent when audio state changes from elsewhere
// (e.g. PlayBar pause, audio-element events).
function* watchPlayerPlaySucceeded() {
  yield* takeEvery(
    playerActions.playSucceeded.type,
    function* (action: ReturnType<typeof playerActions.playSucceeded>) {
      const index = yield* select(getPlaybackIndex)
      if (index < 0) return
      yield* put(
        playbackActions.playSucceeded({
          previewing: action.payload?.isPreview
        })
      )
    }
  )
}

function* watchPlayerPause() {
  yield* takeEvery(playerActions.pause.type, function* () {
    const playbackPlaying = yield* select(getPlaybackIsPlaying)
    if (playbackPlaying) {
      yield* put(playbackActions.pause())
    }
  })
}

// Mirror legacy queue shuffle/repeat into the playback slice so that natural
// track-end (which fires playbackActions.next as the audio element's onEnd
// from the initial playFrom) honors the user's shuffle/repeat selection.
// Without this, only the next/previous buttons (which dispatch queueActions
// and go through the legacy queue saga) honor shuffle — natural track-end
// silently advances linearly. The PlayBar UI dispatches queueActions.shuffle
// / queueActions.repeat, so this mirror keeps the playback slice in sync.
function* watchQueueShuffle() {
  yield* takeEvery(
    queueActions.shuffle.type,
    function* (action: ReturnType<typeof queueActions.shuffle>) {
      yield* put(playbackActions.setShuffle({ enable: action.payload.enable }))
    }
  )
}

function* watchQueueRepeat() {
  yield* takeEvery(
    queueActions.repeat.type,
    function* (action: ReturnType<typeof queueActions.repeat>) {
      yield* put(playbackActions.setRepeat({ mode: action.payload.mode }))
    }
  )
}

const PAGINATE_THRESHOLD = 3

function* maybePaginate(queueLen: number, index: number) {
  if (index + PAGINATE_THRESHOLD < queueLen) return
  const querySource = yield* select(getQuerySource)
  if (!querySource) return
  const queryClient = yield* getContext('queryClient')
  if (!queryClient) return
  try {
    yield* call([queryClient, queryClient.fetchQuery], {
      queryKey: querySource.queryKey
    })
  } catch {
    // Network / staleness errors shouldn't crash playback.
  }
}

export const sagas = () => [
  watchPlayFrom,
  watchPlayTrackAt,
  watchNext,
  watchPrevious,
  watchTogglePlay,
  watchPlay,
  watchPause,
  watchSeekTo,
  watchSetPlaybackRate,
  watchPlayerPlaySucceeded,
  watchPlayerPause,
  watchQueueShuffle,
  watchQueueRepeat
]
