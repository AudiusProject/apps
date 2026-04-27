import { CommonState } from '../commonStore'

export const getPlaybackQueue = (state: CommonState) => state.playback.queue
export const getPlaybackIndex = (state: CommonState) => state.playback.index
export const getCurrentPlaybackTrack = (state: CommonState) => {
  const { queue, index } = state.playback
  if (index < 0 || index >= queue.length) return null
  return queue[index]
}
export const getCurrentTrackId = (state: CommonState) =>
  getCurrentPlaybackTrack(state)?.trackId ?? null
export const getCurrentSource = (state: CommonState) =>
  getCurrentPlaybackTrack(state)?.source ?? null
export const getUpNext = (state: CommonState) => {
  const { queue, index } = state.playback
  if (index < 0) return []
  return queue.slice(index + 1)
}
export const getIsPlaying = (state: CommonState) => state.playback.playing
export const getIsBuffering = (state: CommonState) => state.playback.buffering
export const getIsPreviewing = (state: CommonState) => state.playback.previewing
export const getSeek = (state: CommonState) => state.playback.seek
export const getSeekCounter = (state: CommonState) => state.playback.seekCounter
export const getCounter = (state: CommonState) => state.playback.counter
export const getPlaybackRate = (state: CommonState) =>
  state.playback.playbackRate
export const getRepeat = (state: CommonState) => state.playback.repeat
export const getShuffle = (state: CommonState) => state.playback.shuffle
export const getQuerySource = (state: CommonState) => state.playback.querySource
export const getRetries = (state: CommonState) => state.playback.retries
export const getOvershot = (state: CommonState) => state.playback.overshot
export const getUndershot = (state: CommonState) => state.playback.undershot
