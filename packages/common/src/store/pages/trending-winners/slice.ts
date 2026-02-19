import { combineReducers, createSlice } from '@reduxjs/toolkit'

import { asLineup } from '~/store/lineup/reducer'

import { PREFIX } from './lineup/actions'
import trendingReducer, {
  initialState as initialLineupState
} from './lineup/reducer'

const initialState = { trending: initialLineupState }

const slice = createSlice({
  name: 'application/pages/trendingWinners',
  initialState,
  reducers: {}
})

const trendingWinnersLineupReducer = asLineup(PREFIX, trendingReducer)

export default combineReducers({
  page: slice.reducer,
  trending: trendingWinnersLineupReducer
})
