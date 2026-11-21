import { ID, PlaylistLibraryKind } from '@audius/common/models'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { AppState } from 'store/types'

export type DragDropKind =
  | PlaylistLibraryKind
  | 'track'
  | 'album'
  | 'table-row'
  // Special kind for the winner tile in the pick winners page
  | 'winner-tile'

export type DragnDropState = {
  dragging: boolean
  isOwner?: boolean
  kind?: DragDropKind
  id?: ID | string
  index?: number
}

type DragAction = PayloadAction<{
  kind: DragDropKind
  id: ID | string
  index?: number
  isOwner?: boolean
}>

const initialState: DragnDropState = {
  dragging: false
}

const slice = createSlice({
  name: 'dragndrop',
  initialState,
  reducers: {
    drag(state, action: DragAction) {
      const { kind, id, index, isOwner } = action.payload
      state.dragging = true
      state.kind = kind
      state.id = id
      state.index = index
      state.isOwner = isOwner
    },
    drop() {
      return { ...initialState }
    }
  }
})

export const selectDragnDropState = (state: AppState) => state.dragndrop

export const selectDraggingKind = (state: AppState) => state.dragndrop.kind
export const selectDraggingId = (state: AppState) => state.dragndrop.id

export const { drag, drop } = slice.actions
export default slice.reducer
