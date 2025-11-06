import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { combineReducers } from 'redux'

import { asLineup } from '~/store/lineup/reducer'

import { ID } from '../../../models/Identifiers'

import { PREFIX as exclusiveTracksPrefix } from './lineup/actions'
import exclusiveTracksReducer, {
  initialState as initialLineupState
} from './lineup/reducer'

type State = {
  userId: ID | null
  tracks: typeof initialLineupState
}

const initialState: State = {
  userId: null,
  tracks: initialLineupState
}

const slice = createSlice({
  name: 'application/pages/exclusiveTracks',
  initialState,
  reducers: {
    reset: (state) => {
      state.userId = null
    },
    setUserId: (state, action: PayloadAction<{ userId: ID }>) => {
      const { userId } = action.payload
      state.userId = userId
    }
  }
})

const exclusiveTracksLineupReducer = asLineup(
  exclusiveTracksPrefix,
  exclusiveTracksReducer
)

export const { reset, setUserId } = slice.actions

export default combineReducers({
  page: slice.reducer,
  tracks: exclusiveTracksLineupReducer
})

export const actions = slice.actions
