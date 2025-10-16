import { CommonState } from '../commonStore'

export const getHasTrack = (state: CommonState) => !!state.player.trackId
export const getUid = (state: CommonState) => state.player.uid
export const getTrackId = (state: CommonState) => state.player.trackId

export const getPlaying = (state: CommonState) => state.player.playing
export const getPreviewing = (state: CommonState) => state.player.previewing
export const getPaused = (state: CommonState) => !state.player.playing
export const getCounter = (state: CommonState) => state.player.counter
export const getBuffering = (state: CommonState) => state.player.buffering
export const getSeek = (state: CommonState) => state.player.seek
export const getSeekCounter = (state: CommonState) => state.player.seekCounter
export const getPlaybackRate = (state: CommonState) => state.player.playbackRate
export const getPlayerBehavior = (state: CommonState) =>
  state.player.playerBehavior

export const getPlaybackRetryCount = (state: CommonState) =>
  state.player.retries
