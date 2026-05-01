import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { ID } from '~/models/Identifiers'

import { PlaybackPositionInfo, PlaybackPositionState } from './types'

type InitializePlaybackPositionStatePayload = {
  playbackPositionState: PlaybackPositionState
}

type SetTrackPositionPayload = {
  trackId: ID
  userId?: ID | null
  positionInfo: PlaybackPositionInfo
}

type ClearTrackPositionPayload = {
  trackId: ID
  userId?: ID | null
}

const initialState: PlaybackPositionState = {}

// Cap how many tracks we remember per user. Resume position is only useful for
// recently played long-form content, so an unbounded map just bloats storage.
const MAX_TRACK_POSITIONS_PER_USER = 10

const slice = createSlice({
  name: 'playback-position',
  initialState,
  reducers: {
    // NOTE: This should only be called when seeding the initial state from local storage
    initializePlaybackPositionState: (
      state,
      action: PayloadAction<InitializePlaybackPositionStatePayload>
    ) => {
      const { playbackPositionState } = action.payload
      const userIds = Object.keys(playbackPositionState)
      userIds.forEach((userId) => {
        state[userId] = playbackPositionState[userId]
      })
    },
    setTrackPosition: (
      state,
      action: PayloadAction<SetTrackPositionPayload>
    ) => {
      const { userId, trackId, positionInfo } = action.payload
      if (!userId) return

      const userState = state[userId] ?? { trackPositions: {} }

      // Re-insert (delete then set) so the most recently updated track moves
      // to the end of the insertion-ordered map, making the LRU trim below
      // drop the oldest entries first.
      delete userState.trackPositions[trackId]
      userState.trackPositions[trackId] = positionInfo

      const trackIds = Object.keys(userState.trackPositions)
      const overflow = trackIds.length - MAX_TRACK_POSITIONS_PER_USER
      for (let i = 0; i < overflow; i++) {
        delete userState.trackPositions[trackIds[i]]
      }

      state[userId] = userState
    },
    clearTrackPosition: (
      state,
      action: PayloadAction<ClearTrackPositionPayload>
    ) => {
      const { userId, trackId } = action.payload
      if (!userId) return
      delete state[userId]?.trackPositions[trackId]
    }
  }
})

export const {
  initializePlaybackPositionState,
  setTrackPosition,
  clearTrackPosition
} = slice.actions

export const actions = slice.actions
export default slice.reducer
