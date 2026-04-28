import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { Feature, ID, UID } from '../../models'
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
  playingUid: null,
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
  shuffleOrder: [],
  shuffleIndex: -1,
  querySource: null,
  retries: 0,
  overshot: false,
  undershot: false
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

type PlayPayload = Maybe<{
  // Resume / load by uid (used by chat playback and natural-track-end paths
  // that don't know the queue index — the saga finds the index from the uid).
  uid?: Nullable<UID>
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

type RemoveByUidPayload = {
  uid: UID
}

type AppendPagePayload = {
  tracks: PlaybackTrack[]
}

type ReorderPayload = {
  orderedUids: UID[]
}

type SetIndexPayload = {
  index?: number
  shuffleIndex?: number
}

type NextPayload = { skip?: boolean } | undefined

type SeekPayload = { seconds: number }
type SetPlaybackRatePayload = { rate: PlaybackRate }
type SetRepeatPayload = { mode: RepeatMode }
type SetShufflePayload = { enable: boolean }
type SetBufferingPayload = { buffering: boolean }
type PlaySucceededPayload =
  | { uid?: Nullable<UID>; trackId?: ID; isPreview?: boolean }
  | undefined

type SetPayload = {
  uid: UID
  trackId: ID
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
  feature?: Feature
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
      state.queue = tracks
      state.index = Math.max(0, Math.min(startIndex, tracks.length - 1))
      state.querySource = querySource ?? null
      state.counter += 1
      state.retries = 0
      state.seek = null
      state.overshot = false
      state.undershot = false
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
      state.overshot = false
      state.undershot = false
      if (state.shuffle) {
        state.shuffleOrder = generateShuffleOrder(state.queue.length, index)
        state.shuffleIndex = 0
      }
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
      state.playingUid = null
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
      if (state.shuffle) {
        const nextShuffle = state.shuffleIndex + 1
        if (nextShuffle >= state.shuffleOrder.length) {
          if (state.repeat === RepeatMode.ALL) {
            state.shuffleIndex = 0
          } else {
            state.overshot = true
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
            state.overshot = true
            return
          }
        } else {
          state.index = state.index + 1
        }
      }
      state.counter += 1
      state.retries = 0
      state.seek = null
      state.overshot = false
      state.undershot = false
    },

    previous: (state) => {
      if (state.queue.length === 0) return
      if (state.shuffle) {
        const prevShuffle = state.shuffleIndex - 1
        if (prevShuffle < 0) {
          if (state.repeat === RepeatMode.ALL) {
            state.shuffleIndex = state.shuffleOrder.length - 1
          } else {
            state.undershot = true
            return
          }
        } else {
          state.shuffleIndex = prevShuffle
        }
        state.index = state.shuffleOrder[state.shuffleIndex]
      } else {
        if (state.index - 1 < 0) {
          state.undershot = true
          return
        }
        state.index = state.index - 1
      }
      state.counter += 1
      state.retries = 0
      state.seek = null
      state.overshot = false
      state.undershot = false
    },

    addToQueue: (state, action: PayloadAction<AddToQueuePayload>) => {
      const { tracks, index } = action.payload
      if (index === undefined) {
        state.queue = [...state.queue, ...tracks]
        return
      }
      const insertAt = Math.max(0, Math.min(index, state.queue.length))
      const next = [...state.queue]
      next.splice(insertAt, 0, ...tracks)
      state.queue = next
      if (state.index >= insertAt) {
        state.index += tracks.length
      }
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
        state.index = Math.min(state.index, state.queue.length - 1)
      }
    },

    removeByUid: (state, action: PayloadAction<RemoveByUidPayload>) => {
      const { uid } = action.payload
      const idx = state.queue.findIndex((t) => t.uid === uid)
      if (idx < 0) return
      const next = [...state.queue]
      next.splice(idx, 1)
      state.queue = next
      if (idx < state.index) state.index -= 1
      else if (idx === state.index) {
        state.index = Math.min(state.index, state.queue.length - 1)
      }
    },

    reorder: (state, action: PayloadAction<ReorderPayload>) => {
      const { orderedUids } = action.payload
      const byUid = new Map<UID, PlaybackTrack>()
      state.queue.forEach((t) => {
        if (t.uid) byUid.set(t.uid, t)
      })
      const newOrder = orderedUids
        .map((uid) => byUid.get(uid))
        .filter((t): t is PlaybackTrack => !!t)
      const currentUid =
        state.index >= 0 ? state.queue[state.index]?.uid : undefined
      state.queue = newOrder
      state.index = currentUid
        ? Math.max(0, newOrder.findIndex((t) => t.uid === currentUid))
        : -1
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
      const payload = action.payload ?? {}
      if (payload.uid) state.playingUid = payload.uid
      if (payload.trackId) state.playingTrackId = payload.trackId
      state.previewing = !!payload.isPreview
    },

    set: (state, action: PayloadAction<SetPayload>) => {
      const { uid, trackId, previewing } = action.payload
      state.playingUid = uid
      state.playingTrackId = trackId
      state.previewing = !!previewing
    },

    setIndex: (state, action: PayloadAction<SetIndexPayload>) => {
      const { index, shuffleIndex } = action.payload
      if (typeof index === 'number') state.index = index
      if (typeof shuffleIndex === 'number') state.shuffleIndex = shuffleIndex
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
  removeByUid,
  reorder,
  appendPage,
  clearQueue,
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
