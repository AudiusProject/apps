import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { ID } from '../../models'
import { Maybe, Nullable } from '../../utils'

import {
  PlaybackQuerySource,
  PlaybackRate,
  PlaybackState,
  PlaybackTrack,
  PlayerBehavior,
  RepeatMode
} from './types'

export const initialState: PlaybackState = {
  queue: [],
  index: -1,
  playingIndex: -1,
  playingTrackId: null,
  playing: false,
  buffering: false,
  previewing: false,
  seek: null,
  seekCounter: 0,
  counter: 0,
  playbackRate: '1x',
  repeat: RepeatMode.OFF,
  shuffle: false,
  shuffleOriginalQueue: [],
  shuffleOriginalIndices: [],
  querySource: null,
  retries: 0,
  overshot: false,
  undershot: false
}

// Build a permutation of [0..length-1] with `currentIndex` (when valid)
// pinned at position 0 — so the currently-playing track stays "current"
// when shuffle toggles on.
const buildShufflePermutation = (length: number, currentIndex: number) => {
  const indices = Array.from({ length }, (_, i) => i).filter(
    (i) => i !== currentIndex
  )
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return currentIndex >= 0 && currentIndex < length
    ? [currentIndex, ...indices]
    : indices
}

// Apply a permutation (an array of original indices) to a source array,
// returning a new array in the permuted order.
const applyPermutation = <T>(source: T[], permutation: number[]): T[] =>
  permutation.map((i) => source[i])

// Drop the entry at `position` from `originalIndices` and decrement any
// remaining entries that pointed past it, since shuffleOriginalQueue just
// shrunk by one.
const removeFromOriginalIndices = (
  originalIndices: number[],
  visibleIndex: number
) => {
  const removedOriginalIndex = originalIndices[visibleIndex]
  const next = originalIndices.filter((_, i) => i !== visibleIndex)
  for (let i = 0; i < next.length; i++) {
    if (next[i] > removedOriginalIndex) next[i] -= 1
  }
  return next
}

type PlayFromPayload = {
  tracks: PlaybackTrack[]
  startIndex: number
  querySource?: PlaybackQuerySource | null
}

type PlayTrackAtPayload = {
  index: number
}

type PlayPayload = Maybe<{
  // Resume / load by trackId (used by chat playback and natural-track-end
  // paths that don't know the queue index — the saga finds the index from
  // the trackId).
  trackId?: ID
  startTime?: number
  playerBehavior?: PlayerBehavior
  retries?: number
  onEnd?: (...args: any) => any
}>

type PausePayload = Maybe<{
  // When true, only set the playing flag — don't actually pause the audio
  // engine. Mobile audio uses this to keep redux in sync with engine events.
  onlySetState?: boolean
}>

type StopPayload = Maybe<{}>

type AddToQueuePayload = {
  tracks: PlaybackTrack[]
  // Optional insertion index; defaults to end.
  index?: number
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

type ReorderPayload = {
  // The new ordering expressed as the old indices in their new positions.
  // E.g. [2, 0, 1] takes queue=[A,B,C] -> [C,A,B].
  orderedIndices: number[]
}

type SetIndexPayload = {
  index: number
}

type NextPayload = { skip?: boolean } | undefined

type SeekPayload = { seconds: number }
type SetPlaybackRatePayload = { rate: PlaybackRate }
type SetRepeatPayload = { mode: RepeatMode }
type SetShufflePayload = { enable: boolean }
type SetBufferingPayload = { buffering: boolean }
type PlaySucceededPayload =
  | { trackId?: ID; index?: number; isPreview?: boolean }
  | undefined

type SetPayload = {
  trackId: ID
  index: number
  previewing?: boolean
}

type ResetPayload = {
  shouldAutoplay: boolean
}

type ResetSucceededPayload = {
  shouldAutoplay: boolean
}

type ErrorPayload = {
  error: string
  trackId: ID
  info: string
}

type SetRetriesPayload = { retries: number }

type QueueAutoplayPayload = {
  genre: string
  exclusionList: number[]
  currentUserId: Nullable<ID> | undefined
}

const slice = createSlice({
  name: 'playback',
  initialState,
  reducers: {
    playFrom: (state, action: PayloadAction<PlayFromPayload>) => {
      const { tracks, startIndex, querySource } = action.payload
      const clampedStart = Math.max(0, Math.min(startIndex, tracks.length - 1))
      if (state.shuffle && tracks.length > 0) {
        const permutation = buildShufflePermutation(tracks.length, clampedStart)
        state.shuffleOriginalQueue = tracks
        state.shuffleOriginalIndices = permutation
        state.queue = applyPermutation(tracks, permutation)
        state.index = 0
      } else {
        state.queue = tracks
        state.index = clampedStart
        state.shuffleOriginalQueue = []
        state.shuffleOriginalIndices = []
      }
      state.querySource = querySource ?? null
      state.counter += 1
      state.retries = 0
      state.seek = null
      state.overshot = false
      state.undershot = false
    },

    playTrackAt: (state, action: PayloadAction<PlayTrackAtPayload>) => {
      const { index } = action.payload
      if (index < 0 || index >= state.queue.length) return
      // Queue is already in playable order (shuffled or not), so we just
      // jump to the chosen position.
      state.index = index
      state.counter += 1
      state.retries = 0
      state.seek = null
      state.overshot = false
      state.undershot = false
    },

    // Resume / load. The saga handles the load+play cycle and sets retries.
    play: (state, action: PayloadAction<PlayPayload>) => {
      state.retries = action.payload?.retries ?? 0
    },

    pause: (_state, _action: PayloadAction<PausePayload>) => {
      // The audio engine actually pauses; setPlayingState reconciles state.
    },

    stop: (state, _action: PayloadAction<StopPayload>) => {
      state.playing = false
      state.playingIndex = -1
      state.playingTrackId = null
      state.counter += 1
    },

    togglePlay: (state) => {
      state.playing = !state.playing
    },

    setPlayingState: (state, action: PayloadAction<{ playing: boolean }>) => {
      state.playing = action.payload.playing
    },

    next: (state, action: PayloadAction<NextPayload>) => {
      const skip = action.payload?.skip
      if (state.queue.length === 0) return
      // Repeat-single on a natural track end (skip falsy): keep the same
      // index, and let the saga re-issue play to restart the current track.
      // The next button passes skip=true, which bypasses this and advances.
      if (state.repeat === RepeatMode.SINGLE && !skip) {
        state.counter += 1
        state.retries = 0
        state.seek = null
        state.overshot = false
        state.undershot = false
        return
      }
      if (state.index + 1 >= state.queue.length) {
        if (state.repeat === RepeatMode.ALL) {
          state.index = 0
        } else {
          state.overshot = true
          return
        }
      } else {
        state.index = state.index + 1
      }
      state.counter += 1
      state.retries = 0
      state.seek = null
      state.overshot = false
      state.undershot = false
    },

    previous: (state) => {
      if (state.queue.length === 0) return
      if (state.index - 1 < 0) {
        state.undershot = true
        return
      }
      state.index = state.index - 1
      state.counter += 1
      state.retries = 0
      state.seek = null
      state.overshot = false
      state.undershot = false
    },

    addToQueue: (state, action: PayloadAction<AddToQueuePayload>) => {
      const { tracks, index } = action.payload
      if (tracks.length === 0) return
      const insertAt =
        index === undefined
          ? state.queue.length
          : Math.max(0, Math.min(index, state.queue.length))

      const next = [...state.queue]
      next.splice(insertAt, 0, ...tracks)
      state.queue = next
      if (insertAt <= state.index) {
        state.index += tracks.length
      }

      if (state.shuffle) {
        // New tracks are appended to originalQueue (they have no "natural"
        // position pre-shuffle). Their original indices then point at the
        // newly-appended slots.
        const baseOriginalIndex = state.shuffleOriginalQueue.length
        state.shuffleOriginalQueue = [...state.shuffleOriginalQueue, ...tracks]
        const newOriginalIndices = tracks.map((_, i) => baseOriginalIndex + i)
        const nextOriginal = [...state.shuffleOriginalIndices]
        nextOriginal.splice(insertAt, 0, ...newOriginalIndices)
        state.shuffleOriginalIndices = nextOriginal
      }
    },

    playNext: (state, action: PayloadAction<PlayNextPayload>) => {
      const insertAt = Math.max(0, state.index + 1)
      const next = [...state.queue]
      next.splice(insertAt, 0, action.payload.track)
      state.queue = next

      if (state.shuffle) {
        const baseOriginalIndex = state.shuffleOriginalQueue.length
        state.shuffleOriginalQueue = [
          ...state.shuffleOriginalQueue,
          action.payload.track
        ]
        const nextOriginal = [...state.shuffleOriginalIndices]
        nextOriginal.splice(insertAt, 0, baseOriginalIndex)
        state.shuffleOriginalIndices = nextOriginal
      }
    },

    removeFromQueue: (state, action: PayloadAction<RemoveFromQueuePayload>) => {
      const { index } = action.payload
      if (index < 0 || index >= state.queue.length) return

      if (state.shuffle && state.shuffleOriginalIndices.length > 0) {
        const removedOriginalIdx = state.shuffleOriginalIndices[index]
        state.shuffleOriginalIndices = removeFromOriginalIndices(
          state.shuffleOriginalIndices,
          index
        )
        state.shuffleOriginalQueue = state.shuffleOriginalQueue.filter(
          (_, i) => i !== removedOriginalIdx
        )
      }

      const next = [...state.queue]
      next.splice(index, 1)
      state.queue = next
      if (index < state.index) state.index -= 1
      else if (index === state.index) {
        state.index = Math.min(state.index, state.queue.length - 1)
      }
    },

    reorder: (state, action: PayloadAction<ReorderPayload>) => {
      const { orderedIndices } = action.payload
      const newOrder = orderedIndices
        .map((i) => state.queue[i])
        .filter((t): t is PlaybackTrack => !!t)
      const currentIndex = state.index
      state.queue = newOrder
      state.index =
        currentIndex >= 0
          ? Math.max(0, orderedIndices.indexOf(currentIndex))
          : -1

      if (state.shuffle && state.shuffleOriginalIndices.length > 0) {
        // The reorder rearranges visible positions; original-position
        // mappings move with their tracks. shuffleOriginalQueue itself is
        // untouched — its purpose is to remember the pre-shuffle order.
        state.shuffleOriginalIndices = orderedIndices
          .map((i) => state.shuffleOriginalIndices[i])
          .filter((v): v is number => v !== undefined)
      }
    },

    appendPage: (state, action: PayloadAction<AppendPagePayload>) => {
      const { tracks } = action.payload
      if (tracks.length === 0) return
      // Used by the saga when the backing tanquery fetches a next page.
      state.queue = [...state.queue, ...tracks]

      if (state.shuffle) {
        const baseOriginalIndex = state.shuffleOriginalQueue.length
        state.shuffleOriginalQueue = [...state.shuffleOriginalQueue, ...tracks]
        state.shuffleOriginalIndices = [
          ...state.shuffleOriginalIndices,
          ...tracks.map((_, i) => baseOriginalIndex + i)
        ]
      }
    },

    clearQueue: (state) => {
      state.queue = []
      state.index = -1
      state.shuffleOriginalQueue = []
      state.shuffleOriginalIndices = []
      state.querySource = null
    },

    // Clear everything except the currently playing track. The track keeps
    // playing and stays in the queue at index 0; upcoming tracks and
    // pagination source are dropped.
    clearUpcoming: (state) => {
      if (state.index < 0 || state.index >= state.queue.length) {
        state.queue = []
        state.index = -1
        state.shuffleOriginalQueue = []
        state.shuffleOriginalIndices = []
      } else {
        const current = state.queue[state.index]
        state.queue = [current]
        state.index = 0
        if (state.shuffle) {
          state.shuffleOriginalQueue = [current]
          state.shuffleOriginalIndices = [0]
        } else {
          state.shuffleOriginalQueue = []
          state.shuffleOriginalIndices = []
        }
      }
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
      if (enable === state.shuffle) return
      state.shuffle = enable

      if (enable) {
        if (state.queue.length === 0) {
          state.shuffleOriginalQueue = []
          state.shuffleOriginalIndices = []
          return
        }
        const permutation = buildShufflePermutation(
          state.queue.length,
          state.index
        )
        state.shuffleOriginalQueue = [...state.queue]
        state.shuffleOriginalIndices = permutation
        state.queue = applyPermutation(state.shuffleOriginalQueue, permutation)
        // currentIndex was pinned to position 0 when valid.
        state.index =
          state.index >= 0 && state.index < state.shuffleOriginalQueue.length
            ? 0
            : state.index
      } else {
        if (state.shuffleOriginalQueue.length === 0) {
          state.shuffleOriginalIndices = []
          return
        }
        const currentOriginalIndex =
          state.index >= 0 && state.index < state.shuffleOriginalIndices.length
            ? state.shuffleOriginalIndices[state.index]
            : -1
        state.queue = state.shuffleOriginalQueue
        state.index = currentOriginalIndex
        state.shuffleOriginalQueue = []
        state.shuffleOriginalIndices = []
      }
    },

    setBuffering: (state, action: PayloadAction<SetBufferingPayload>) => {
      state.buffering = action.payload.buffering
    },

    playSucceeded: (state, action: PayloadAction<PlaySucceededPayload>) => {
      state.playing = true
      const payload = action.payload ?? {}
      if (typeof payload.index === 'number') state.playingIndex = payload.index
      if (payload.trackId) state.playingTrackId = payload.trackId
      state.previewing = !!payload.isPreview
    },

    set: (state, action: PayloadAction<SetPayload>) => {
      const { trackId, index, previewing } = action.payload
      state.playingIndex = index
      state.playingTrackId = trackId
      state.previewing = !!previewing
    },

    setIndex: (state, action: PayloadAction<SetIndexPayload>) => {
      const { index } = action.payload
      if (typeof index === 'number') state.index = index
    },

    reset: (_state, _action: PayloadAction<ResetPayload>) => {
      // Saga calls audioPlayer.seek(0) and either pauses or replays.
    },

    resetSucceeded: (state, action: PayloadAction<ResetSucceededPayload>) => {
      const { shouldAutoplay } = action.payload
      state.playing = shouldAutoplay
      state.counter += 1
      state.previewing = false
    },

    setRetries: (state, action: PayloadAction<SetRetriesPayload>) => {
      state.retries = action.payload.retries
    },

    incrementCounter: (state) => {
      state.counter += 1
    },

    error: (_state, _action: PayloadAction<ErrorPayload>) => {},

    queueAutoplay: (_state, _action: PayloadAction<QueueAutoplayPayload>) => {}
  }
})

export const {
  playFrom,
  playTrackAt,
  play,
  pause,
  stop,
  togglePlay,
  setPlayingState,
  next,
  previous,
  addToQueue,
  playNext,
  removeFromQueue,
  reorder,
  appendPage,
  clearQueue,
  clearUpcoming,
  seekTo,
  setPlaybackRate,
  setRepeat,
  setShuffle,
  setBuffering,
  playSucceeded,
  set,
  setIndex,
  reset,
  resetSucceeded,
  setRetries,
  incrementCounter,
  error,
  queueAutoplay
} = slice.actions

export default slice.reducer
export const actions = slice.actions
