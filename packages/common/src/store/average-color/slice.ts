import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { Color } from '../../models/Color'

const initialState: {
  averageColor: { [multihash: string]: Color }
  dominantColors: { [multihash: string]: Color[] }
} = {
  averageColor: {},
  dominantColors: {}
}

const slice = createSlice({
  name: 'ui/averageColor',
  initialState,
  reducers: {
    setAverageColor: (
      state,
      action: PayloadAction<{ multihash: string; color: Color }>
    ) => {
      const { multihash, color } = action.payload
      state.averageColor[multihash] = color
    },
    setDominantColors: (
      state,
      action: PayloadAction<{ multihash: string; colors: Color[] }>
    ) => {
      const { multihash, colors } = action.payload
      state.dominantColors[multihash] = colors
    }
  }
})

export const { setAverageColor, setDominantColors } = slice.actions

export const actions = slice.actions

export default slice.reducer
