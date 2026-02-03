import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { ID } from '../../models'
import { Maybe } from '../../utils'
import { PlaybackRate } from '../player/types'
import { RepeatMode } from '../queue/types'

export type PlaybackState = {
  // Current playback context
  lineupId: string | null // ID of the active lineup (e.g., "explore:for-you", "trending")
  currentTrackId: ID | null // ID of currently playing track
  currentIndex: number // Index in the lineup (0-based)

  // Playback status
  isPlaying: boolean
  isBuffering: boolean
  playbackRate: PlaybackRate

  // Playback settings
  repeat: RepeatMode
  shuffle: boolean
  shuffleOrder: number[] | null // Only populated when shuffle is enabled (indices into lineup)
}

export const initialState: PlaybackState = {
  lineupId: null,
  currentTrackId: null,
  currentIndex: -1,

  isPlaying: false,
  isBuffering: false,
  playbackRate: '1x',

  repeat: RepeatMode.OFF,
  shuffle: false,
  shuffleOrder: null
}

type PlayPayload = Maybe<{
  lineupId: string
  trackId: ID
}>

type PlaySucceededPayload = {
  lineupId: string
  trackId: ID
  currentIndex: number
}

type PausePayload = {}

type SetBufferingPayload = {
  buffering: boolean
}

type SeekPayload = {
  seconds: number
}

type SetPlaybackRatePayload = {
  rate: PlaybackRate
}

type NextPayload = {}

type PreviousPayload = {}

type SetRepeatPayload = {
  mode: RepeatMode
}

type SetShufflePayload = {
  enabled: boolean
}

const slice = createSlice({
  name: 'playback',
  initialState,
  reducers: {
    play: (_state, _action: PayloadAction<PlayPayload>) => {
      // Saga will handle the actual logic
    },
    playSucceeded: (state, action: PayloadAction<PlaySucceededPayload>) => {
      const { lineupId, trackId, currentIndex } = action.payload
      state.lineupId = lineupId
      state.currentTrackId = trackId
      state.currentIndex = currentIndex
      state.isPlaying = true
    },
    pause: (state, _action: PayloadAction<PausePayload>) => {
      state.isPlaying = false
    },
    setBuffering: (state, action: PayloadAction<SetBufferingPayload>) => {
      state.isBuffering = action.payload.buffering
    },
    seek: (_state, _action: PayloadAction<SeekPayload>) => {
      // Saga will handle the actual seek logic
    },
    setPlaybackRate: (state, action: PayloadAction<SetPlaybackRatePayload>) => {
      state.playbackRate = action.payload.rate
    },
    next: (_state, _action: PayloadAction<NextPayload>) => {
      // Saga will handle the actual logic
    },
    previous: (_state, _action: PayloadAction<PreviousPayload>) => {
      // Saga will handle the actual logic
    },
    setRepeat: (state, action: PayloadAction<SetRepeatPayload>) => {
      state.repeat = action.payload.mode
    },
    setShuffle: (state, action: PayloadAction<SetShufflePayload>) => {
      state.shuffle = action.payload.enabled
      if (!action.payload.enabled) {
        state.shuffleOrder = null
      }
    },
    stop: (state) => {
      state.isPlaying = false
      state.currentTrackId = null
      state.lineupId = null
      state.currentIndex = -1
    }
  }
})

export const {
  play,
  playSucceeded,
  pause,
  setBuffering,
  seek,
  setPlaybackRate,
  next,
  previous,
  setRepeat,
  setShuffle,
  stop
} = slice.actions

export default slice.reducer
export const actions = slice.actions
