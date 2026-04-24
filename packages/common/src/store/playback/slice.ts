import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { Feature, ID } from '../../models'
import { PlaybackRate } from '../player/types'
import { RepeatMode } from '../queue/types'

import { PlaybackQuerySource, PlaybackState, PlaybackTrack } from './types'

export const initialState: PlaybackState = {
  queue: [],
  index: -1,
  playing: false,
  buffering: false,
  previewing: false,
  seek: null,
  seekCounter: 0,
  counter: 0,
  playbackRate: '1x',
  repeat: RepeatMode.OFF,
  shuffle: false,
  shuffleOrder: [],
  shuffleIndex: -1,
  querySource: null,
  retries: 0
}

const generateShuffleOrder = (queueLength: number, currentIndex: number) => {
  const availableIndices = Array.from(
    { length: queueLength },
    (_, i) => i
  ).filter((i) => i !== currentIndex)
  const shuffled = availableIndices.sort(() => Math.random() - 0.5)
  return currentIndex >= 0 ? [currentIndex, ...shuffled] : shuffled
}

type PlayFromPayload = {
  tracks: PlaybackTrack[]
  startIndex: number
  querySource?: PlaybackQuerySource | null
}

type PlayTrackAtPayload = {
  index: number
}

type AddToQueuePayload = {
  tracks: PlaybackTrack[]
}

type PlayNextPayload = {
  track: PlaybackTrack
}

type RemoveFromQueuePayload = {
  index: number
}

type AppendPagePayload = {
  tracks: PlaybackTrack[]
}

type NextPayload = { skip?: boolean } | undefined

type SeekPayload = { seconds: number }
type SetPlaybackRatePayload = { rate: PlaybackRate }
type SetRepeatPayload = { mode: RepeatMode }
type SetShufflePayload = { enable: boolean }
type SetBufferingPayload = { buffering: boolean }
type PlaySucceededPayload = { previewing?: boolean } | undefined
type ErrorPayload = {
  error: string
  trackId: ID
  info: string
  feature?: Feature
}
type SetRetriesPayload = { retries: number }

const slice = createSlice({
  name: 'playback',
  initialState,
  reducers: {
    playFrom: (state, action: PayloadAction<PlayFromPayload>) => {
      const { tracks, startIndex, querySource } = action.payload
      state.queue = tracks
      state.index = Math.max(0, Math.min(startIndex, tracks.length - 1))
      state.querySource = querySource ?? null
      state.counter += 1
      state.retries = 0
      state.seek = null
      if (state.shuffle) {
        state.shuffleOrder = generateShuffleOrder(
          state.queue.length,
          state.index
        )
        state.shuffleIndex = 0
      }
    },

    playTrackAt: (state, action: PayloadAction<PlayTrackAtPayload>) => {
      const { index } = action.payload
      if (index < 0 || index >= state.queue.length) return
      state.index = index
      state.counter += 1
      state.retries = 0
      state.seek = null
      if (state.shuffle) {
        state.shuffleOrder = generateShuffleOrder(state.queue.length, index)
        state.shuffleIndex = 0
      }
    },

    // Resume playing the current track (no index change).
    play: (state) => {
      state.playing = true
    },

    pause: (state) => {
      state.playing = false
    },

    stop: (state) => {
      state.playing = false
    },

    togglePlay: (state) => {
      state.playing = !state.playing
    },

    next: (state, _action: PayloadAction<NextPayload>) => {
      if (state.queue.length === 0) return
      if (state.shuffle) {
        const nextShuffle = state.shuffleIndex + 1
        if (nextShuffle >= state.shuffleOrder.length) {
          if (state.repeat === RepeatMode.ALL) {
            state.shuffleIndex = 0
          } else {
            return
          }
        } else {
          state.shuffleIndex = nextShuffle
        }
        state.index = state.shuffleOrder[state.shuffleIndex]
      } else {
        if (state.index + 1 >= state.queue.length) {
          if (state.repeat === RepeatMode.ALL) {
            state.index = 0
          } else {
            return
          }
        } else {
          state.index = state.index + 1
        }
      }
      state.counter += 1
      state.retries = 0
      state.seek = null
    },

    previous: (state) => {
      if (state.queue.length === 0) return
      if (state.shuffle) {
        const prevShuffle = state.shuffleIndex - 1
        if (prevShuffle < 0) {
          if (state.repeat === RepeatMode.ALL) {
            state.shuffleIndex = state.shuffleOrder.length - 1
          } else {
            return
          }
        } else {
          state.shuffleIndex = prevShuffle
        }
        state.index = state.shuffleOrder[state.shuffleIndex]
      } else {
        if (state.index - 1 < 0) return
        state.index = state.index - 1
      }
      state.counter += 1
      state.retries = 0
      state.seek = null
    },

    addToQueue: (state, action: PayloadAction<AddToQueuePayload>) => {
      state.queue = [...state.queue, ...action.payload.tracks]
    },

    playNext: (state, action: PayloadAction<PlayNextPayload>) => {
      const insertAt = Math.max(0, state.index + 1)
      const next = [...state.queue]
      next.splice(insertAt, 0, action.payload.track)
      state.queue = next
    },

    removeFromQueue: (state, action: PayloadAction<RemoveFromQueuePayload>) => {
      const { index } = action.payload
      if (index < 0 || index >= state.queue.length) return
      const next = [...state.queue]
      next.splice(index, 1)
      state.queue = next
      if (index < state.index) state.index -= 1
      else if (index === state.index) {
        // If the currently-playing track is removed, clamp the index.
        state.index = Math.min(state.index, state.queue.length - 1)
      }
    },

    appendPage: (state, action: PayloadAction<AppendPagePayload>) => {
      // Used by the saga when the backing tanquery fetches a next page.
      state.queue = [...state.queue, ...action.payload.tracks]
    },

    clearQueue: (state) => {
      state.queue = []
      state.index = -1
      state.shuffleOrder = []
      state.shuffleIndex = -1
      state.querySource = null
    },

    seekTo: (state, action: PayloadAction<SeekPayload>) => {
      state.seek = action.payload.seconds
      state.seekCounter += 1
    },

    setPlaybackRate: (state, action: PayloadAction<SetPlaybackRatePayload>) => {
      state.playbackRate = action.payload.rate
    },

    setRepeat: (state, action: PayloadAction<SetRepeatPayload>) => {
      state.repeat = action.payload.mode
    },

    setShuffle: (state, action: PayloadAction<SetShufflePayload>) => {
      const { enable } = action.payload
      state.shuffle = enable
      if (enable && state.queue.length > 0) {
        state.shuffleOrder = generateShuffleOrder(
          state.queue.length,
          state.index
        )
        state.shuffleIndex = 0
      } else if (!enable) {
        state.shuffleOrder = []
        state.shuffleIndex = -1
      }
    },

    setBuffering: (state, action: PayloadAction<SetBufferingPayload>) => {
      state.buffering = action.payload.buffering
    },

    playSucceeded: (state, action: PayloadAction<PlaySucceededPayload>) => {
      state.playing = true
      state.previewing = !!action.payload?.previewing
    },

    setRetries: (state, action: PayloadAction<SetRetriesPayload>) => {
      state.retries = action.payload.retries
    },

    incrementCounter: (state) => {
      state.counter += 1
    },

    error: (_state, _action: PayloadAction<ErrorPayload>) => {}
  }
})

export const {
  playFrom,
  playTrackAt,
  play,
  pause,
  stop,
  togglePlay,
  next,
  previous,
  addToQueue,
  playNext,
  removeFromQueue,
  appendPage,
  clearQueue,
  seekTo,
  setPlaybackRate,
  setRepeat,
  setShuffle,
  setBuffering,
  playSucceeded,
  setRetries,
  incrementCounter,
  error
} = slice.actions

export default slice.reducer
export const actions = slice.actions
