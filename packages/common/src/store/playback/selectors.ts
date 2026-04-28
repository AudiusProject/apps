import { createSelector } from 'reselect'

import { ID, UID } from '../../models'
import { Uid } from '../../utils/uid'
import { CommonState } from '../commonStore'

import { PlaybackTrack, PlayerBehavior } from './types'

// Queue + transport
export const getPlaybackQueue = (state: CommonState) => state.playback.queue
export const getPlaybackIndex = (state: CommonState) => state.playback.index
export const getLength = (state: CommonState) => state.playback.queue.length
export const getQuerySource = (state: CommonState) => state.playback.querySource

const isIndexValid = (state: CommonState) => {
  const { queue, index } = state.playback
  return index >= 0 && queue.length > 0 && index < queue.length
}

export const getCurrentPlaybackTrack = (
  state: CommonState
): PlaybackTrack | null => (isIndexValid(state) ? state.playback.queue[state.playback.index] : null)

export const getCurrentTrackId = (state: CommonState) =>
  getCurrentPlaybackTrack(state)?.trackId ?? null

export const getCurrentSource = (state: CommonState) =>
  getCurrentPlaybackTrack(state)?.source ?? null

export const getCurrentEntryUid = (state: CommonState): UID | null =>
  getCurrentPlaybackTrack(state)?.uid ?? null

export const getCurrentPlayerBehavior = (state: CommonState) =>
  getCurrentPlaybackTrack(state)?.playerBehavior ?? PlayerBehavior.FULL_OR_PREVIEW

export const getCollectionId = (state: CommonState) => {
  const uid = getCurrentEntryUid(state)
  if (!uid) return null
  return Uid.getCollectionId(uid)
}

export const getUpNext = (state: CommonState) => {
  const { queue, index } = state.playback
  if (index < 0) return []
  return queue.slice(index + 1)
}

// Audio engine state — these mirror what the legacy `player` slice used to
// expose. `playingUid` / `playingTrackId` lag behind queue[index] until
// playSucceeded fires, which is what tile-highlight comparisons want.
export const getUid = (state: CommonState) => state.playback.playingUid
export const getTrackId = (state: CommonState) => state.playback.playingTrackId
export const getHasTrack = (state: CommonState) =>
  !!state.playback.playingTrackId
export const getIsPlaying = (state: CommonState) => state.playback.playing
export const getPlaying = getIsPlaying
export const getPaused = (state: CommonState) => !state.playback.playing
export const getIsPreviewing = (state: CommonState) => state.playback.previewing
export const getPreviewing = getIsPreviewing
export const getIsBuffering = (state: CommonState) => state.playback.buffering
export const getBuffering = getIsBuffering
export const getCounter = (state: CommonState) => state.playback.counter
export const getSeek = (state: CommonState) => state.playback.seek
export const getSeekCounter = (state: CommonState) => state.playback.seekCounter
export const getPlaybackRate = (state: CommonState) =>
  state.playback.playbackRate
export const getPlaybackRetryCount = (state: CommonState) =>
  state.playback.retries
export const getRetries = getPlaybackRetryCount

// Shuffle / repeat / overshoot
export const getRepeat = (state: CommonState) => state.playback.repeat
export const getShuffle = (state: CommonState) => state.playback.shuffle
export const getShuffleIndex = (state: CommonState) =>
  state.playback.shuffleIndex
export const getShuffleOrder = (state: CommonState) =>
  state.playback.shuffleOrder
export const getOvershot = (state: CommonState) => state.playback.overshot
export const getUndershot = (state: CommonState) => state.playback.undershot

// Membership check by uid (was queueSelectors.getUidInQueue)
export const getUidInQueue = (state: CommonState, props: { uid: UID }) =>
  state.playback.queue.some((t) => t.uid === props.uid)

// Adapter for code that wants the legacy `Queueable[]` shape (id/uid/source/
// playerBehavior). Used by the mobile AudioPlayer to drive react-native-track-
// player and by anything else that iterated the old queue.
type LegacyQueueable = {
  id: ID
  uid: UID
  source: string
  playerBehavior?: PlayerBehavior
}
export const getOrder = createSelector(
  [getPlaybackQueue],
  (queue): LegacyQueueable[] =>
    queue
      .filter((t): t is PlaybackTrack & { uid: UID } => !!t.uid)
      .map((t) => ({
        id: t.trackId,
        uid: t.uid,
        source: t.source,
        playerBehavior: t.playerBehavior
      }))
)

// Returns { uid, source } describing the currently playing entry. Mirrors
// the legacy `queueSelectors.makeGetCurrent`. The uid here is the "currently
// loaded" uid (lags during load), matching legacy semantics.
export const makeGetCurrent = () =>
  createSelector(
    [getUid, getCurrentSource],
    (uid, source) => ({ uid, source })
  )
