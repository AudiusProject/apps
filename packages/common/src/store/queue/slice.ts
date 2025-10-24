import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { ID, UID } from '../../models'
import { Maybe, Nullable } from '../../utils'
import { PlayerBehavior } from '../player'
import { RepeatMode, Queueable, QueueState } from '../queue/types'

export const initialState: QueueState = {
  order: [],
  positions: {},
  index: -1,
  repeat: RepeatMode.OFF,
  shuffle: false,
  shuffleIndex: -1,
  shuffleOrder: [],
  overshot: false,
  undershot: false
}

// Helper function to generate shuffle order with current track first
const generateShuffleOrder = (order: Queueable[], currentIndex: number) => {
  const availableIndices = order
    .map((_, index) => index)
    .filter((index) => index !== currentIndex)

  const shuffledIndices = availableIndices.sort(() => Math.random() - 0.5)

  return currentIndex >= 0
    ? [currentIndex, ...shuffledIndices]
    : shuffledIndices
}

type PlayPayload = {
  uid?: Nullable<UID>
  trackId?: Nullable<ID>
  source?: Nullable<string>
  playerBehavior?: PlayerBehavior
}

type QueueAutoplayPayload = {
  genre: string
  exclusionList: number[]
  currentUserId: Nullable<ID> | undefined
}

type PausePayload = {}

type NextPayload = Maybe<{
  // Whether or not to skip if in repeat mode (passive vs. active next)
  skip?: boolean
}>

type PreviousPayload = undefined

type UpdateIndexPayload = {
  index?: number
  shuffleIndex?: number
}

type RepeatPayload = {
  mode: RepeatMode
}

type ShufflePayload = {
  enable: boolean
}

type ReorderPayload = {
  orderedUids: UID[]
}

type ClearPayload = {}

type AddPayload = {
  entries: Queueable[]
  // Index to insert at
  index?: number
}

type RemovePayload = {
  uid: UID
}

const slice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    // Play the queue, either resuming or playing a new uid if provided */
    play: (state, action: PayloadAction<PlayPayload>) => {
      const { uid } = action.payload
      let newIndex

      if (uid) {
        newIndex = state.positions[uid]
      }

      const previousIndex = state.index
      state.index = newIndex ?? state.index
      state.overshot = false
      state.undershot = false

      // If shuffle is enabled and we're playing a different track, update shuffle order
      if (
        state.shuffle &&
        state.order.length > 0 &&
        newIndex !== undefined &&
        newIndex !== previousIndex
      ) {
        state.shuffleOrder = generateShuffleOrder(state.order, newIndex)
        state.shuffleIndex = 0
      }
    },
    queueAutoplay: (_state, _action: PayloadAction<QueueAutoplayPayload>) => {},
    // Pauses the queue
    pause: (_state, _action: PayloadAction<PausePayload>) => {},
    // Skips the next track in the queue
    next: (state, action: PayloadAction<NextPayload>) => {
      const skip = action.payload?.skip

      if (state.order.length === 0) return

      if (state.repeat === RepeatMode.SINGLE && !skip) {
        return
      }

      if (state.shuffle) {
        const newShuffleIndex = state.shuffleIndex + 1

        // Loop back to beginning if we've reached the end
        if (newShuffleIndex >= state.shuffleOrder.length) {
          if (state.repeat === RepeatMode.ALL) {
            // Loop back to beginning of shuffle order
            state.shuffleIndex = 0
          } else {
            // End of queue reached
            state.overshot = true
            return
          }
        } else {
          state.shuffleIndex = newShuffleIndex
        }

        state.index = state.shuffleOrder[state.shuffleIndex]
        return
      }

      // Next on end of queue
      if (state.index + 1 >= state.order.length) {
        if (state.repeat === RepeatMode.ALL) {
          // Repeat
          state.index = 0
          return
        }
        // Reset to last track
        state.overshot = true
        return
      }

      state.index = state.index + 1
    },
    // Skips to the previous track in the queue
    previous: (state, _action: PayloadAction<PreviousPayload>) => {
      if (state.shuffle) {
        const newShuffleIndex = state.shuffleIndex - 1

        // Loop to end if we've gone before the beginning
        if (newShuffleIndex < 0) {
          if (state.repeat === RepeatMode.ALL) {
            // Loop to end of shuffle order
            state.shuffleIndex = state.shuffleOrder.length - 1
          } else {
            // Beginning of queue reached
            state.undershot = true
            return
          }
        } else {
          state.shuffleIndex = newShuffleIndex
        }

        state.index = state.shuffleOrder[state.shuffleIndex]
        return
      }

      const prevIndex = state.index - 1
      // Previous on beginning of queue
      if (prevIndex < 0) {
        state.undershot = true
        return
      }

      state.index = prevIndex
    },
    // Updates the queue's index to a given value. Useful when the queue
    // is paused, but we would like to resume playback later from somewhere else.
    updateIndex: (state, action: PayloadAction<UpdateIndexPayload>) => {
      const { index, shuffleIndex } = action.payload
      state.index = index ?? state.index
      state.shuffleIndex = shuffleIndex ?? state.shuffleIndex
    },
    // Changes the queue's repeat mode
    repeat: (state, action: PayloadAction<RepeatPayload>) => {
      const { mode } = action.payload
      state.repeat = mode
    },
    // Changes the queue's shuffle mode
    shuffle: (state, action: PayloadAction<ShufflePayload>) => {
      const { enable } = action.payload
      state.shuffle = enable

      if (enable && state.order.length > 0) {
        state.shuffleOrder = generateShuffleOrder(state.order, state.index)
        state.shuffleIndex = 0
      } else if (!enable) {
        // Reset shuffle state when disabling shuffle
        state.shuffleOrder = []
        state.shuffleIndex = -1
      }
    },
    // Reorders the queue to the provided order
    reorder: (state, action: PayloadAction<ReorderPayload>) => {
      const { orderedUids } = action.payload

      const newOrder = orderedUids.map(
        (uid) => state.order[state.positions[uid]]
      )

      const newPositions = orderedUids.reduce(
        (m, uid, i) => {
          m[uid] = i
          return m
        },
        {} as { [uid: string]: number }
      )

      const newIndex =
        state.index >= 0 ? newPositions[state.order[state.index].uid] : -1

      // No shuffle order regeneration here
      state.order = newOrder
      state.positions = newPositions
      state.index = newIndex
    },
    // Adds a track to the queue either at the end or the given index.
    add: (state, action: PayloadAction<AddPayload>) => {
      const { entries, index } = action.payload

      const newIndex = index || state.order.length

      const newOrder = [...state.order]
      newOrder.splice(newIndex, 0, ...entries)

      const addedPositions = entries.reduce(
        (mapping, entry, i) => {
          mapping[entry.uid ?? entry.id] = newIndex + i
          return mapping
        },
        {} as { [uid: string]: number }
      )
      const newPositions = Object.keys(state.positions).reduce(
        (updated, uid) => {
          if (state.positions[uid] >= newIndex) {
            updated[uid] = state.positions[uid] + entries.length
          } else {
            updated[uid] = state.positions[uid]
          }
          return updated
        },
        addedPositions
      )

      // No shuffle order regeneration here
      state.order = newOrder
      state.positions = newPositions
    },
    // Removes a specific uid from the queue
    remove: (state, action: PayloadAction<RemovePayload>) => {
      const { uid: uidToRemove } = action.payload

      const newOrder = state.order.filter((o) => o.uid !== uidToRemove)

      const removedIndex = state.positions[uidToRemove]
      const newPositions = Object.keys(state.positions).reduce(
        (updated, uid) => {
          if (uid === uidToRemove) {
            return updated
          } else if (state.positions[uid] > removedIndex) {
            updated[uid] = state.positions[uid] - 1
          } else {
            updated[uid] = state.positions[uid]
          }
          return updated
        },
        {} as { [uid: string]: number }
      )

      // No shuffle order regeneration here
      state.order = newOrder
      state.positions = newPositions
    },
    // Clears the queue and performs clean up on queued items.
    clear: (state, _action: PayloadAction<ClearPayload>) => {
      state.order = initialState.order
      state.positions = initialState.positions
      state.index = initialState.index
      state.shuffleOrder = initialState.shuffleOrder
      state.shuffleIndex = initialState.shuffleIndex
    }
  }
})

export const {
  play,
  queueAutoplay,
  pause,
  next,
  previous,
  updateIndex,
  repeat,
  shuffle,
  reorder,
  add,
  remove,
  clear
} = slice.actions

export default slice.reducer
export const actions = slice.actions
