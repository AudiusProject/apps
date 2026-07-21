import { createSelector } from 'reselect'

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
): PlaybackTrack | null =>
  isIndexValid(state) ? state.playback.queue[state.playback.index] : null

export const getCurrentTrackId = (state: CommonState) =>
  getCurrentPlaybackTrack(state)?.trackId ?? null

export const getCurrentSource = (state: CommonState) =>
  getCurrentPlaybackTrack(state)?.source ?? null

export const getCollectionId = (state: CommonState) =>
  getCurrentPlaybackTrack(state)?.collectionId ?? null

export const getFeedType = (state: CommonState) =>
  getCurrentPlaybackTrack(state)?.feedType ?? null

export const getCurrentPlayerBehavior = (state: CommonState) =>
  getCurrentPlaybackTrack(state)?.playerBehavior ??
  PlayerBehavior.FULL_OR_PREVIEW

// Audio engine state — these mirror what the legacy `player` slice used to
// expose. `playingIndex` / `playingTrackId` lag behind queue[index] until
// playSucceeded fires, which is what tile-highlight comparisons want.
export const getPlayingIndex = (state: CommonState) =>
  state.playback.playingIndex
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
export const getOvershot = (state: CommonState) => state.playback.overshot
export const getUndershot = (state: CommonState) => state.playback.undershot

export const getUpNext = createSelector(
  [getPlaybackQueue, getPlaybackIndex],
  (queue, index) => (index < 0 ? [] : queue.slice(index + 1))
)

// Returns { trackId, source } describing the currently selected queue entry.
// Reads from queue[index] (updated synchronously by playFrom/playTrackAt) so
// tile-highlight comparisons stay stable during the load gap between
// playFrom and playSucceeded — avoiding a stale `playingIndex` causing a
// double `playFrom` dispatch on rapid retaps.
export const makeGetCurrent = () =>
  createSelector([getPlaybackIndex, getPlaybackQueue], (index, queue) => {
    const entry = index >= 0 && index < queue.length ? queue[index] : null
    return {
      trackId: entry?.trackId ?? null,
      index,
      source: entry?.source ?? null
    }
  })
