import { createSelector } from '@reduxjs/toolkit'

import { CommonState } from '../commonStore'

const getPlaybackState = (state: CommonState) => state.playback

export const getLineupId = createSelector(
  [getPlaybackState],
  (playback) => playback.lineupId
)

export const getCurrentTrackId = createSelector(
  [getPlaybackState],
  (playback) => playback.currentTrackId
)

export const getCurrentIndex = createSelector(
  [getPlaybackState],
  (playback) => playback.currentIndex
)

export const getIsPlaying = createSelector(
  [getPlaybackState],
  (playback) => playback.isPlaying
)

export const getIsBuffering = createSelector(
  [getPlaybackState],
  (playback) => playback.isBuffering
)

export const getPlaybackRate = createSelector(
  [getPlaybackState],
  (playback) => playback.playbackRate
)

export const getRepeat = createSelector(
  [getPlaybackState],
  (playback) => playback.repeat
)

export const getShuffle = createSelector(
  [getPlaybackState],
  (playback) => playback.shuffle
)

export const getShuffleOrder = createSelector(
  [getPlaybackState],
  (playback) => playback.shuffleOrder
)
