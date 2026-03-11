import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import {
  SystemAppearance,
  Theme,
  ThemeMode,
  ThemePalette
} from '../../../models/Theme'
import { Nullable } from '../../../utils'

export type ThemeState = {
  /** @deprecated Use themePalette + themeMode. Legacy - when MATRIX, palette is matrix. */
  theme: Nullable<Theme>
  /** Palette selected in dropdown: default, classic, matrix */
  themePalette: Nullable<ThemePalette>
  /** Mode selected in segmented control: auto, light, dark. Ignored when palette is matrix. */
  themeMode: Nullable<ThemeMode>
  systemAppearance: Nullable<SystemAppearance>
}

export type SetThemeAction = PayloadAction<{
  theme: Theme
}>

export type SetThemePaletteAction = PayloadAction<{
  themePalette: ThemePalette
}>

export type SetThemeModeAction = PayloadAction<{
  themeMode: ThemeMode
}>

export type SetSystemAppearanceAction = PayloadAction<{
  systemAppearance: SystemAppearance
}>

const initialState: ThemeState = {
  theme: null,
  themePalette: null,
  themeMode: null,
  systemAppearance: null
}

const themeSlice = createSlice({
  name: 'application/ui/theme',
  initialState,
  reducers: {
    setTheme: (state, action: SetThemeAction) => {
      state.theme = action.payload.theme
      // Sync legacy theme to new format for backward compat
      if (action.payload.theme === Theme.MATRIX) {
        state.themePalette = ThemePalette.MATRIX
      } else {
        state.themeMode =
          action.payload.theme === Theme.LIGHT
            ? ThemeMode.LIGHT
            : action.payload.theme === Theme.DARK
              ? ThemeMode.DARK
              : ThemeMode.AUTO
        // Preserve palette when updating mode; default to default (Neue) for all users
        if (state.themePalette === null) {
          state.themePalette = ThemePalette.DEFAULT
        }
      }
    },
    setThemePalette: (state, action: SetThemePaletteAction) => {
      state.themePalette = action.payload.themePalette
      if (action.payload.themePalette === ThemePalette.MATRIX) {
        state.theme = Theme.MATRIX
      }
    },
    setThemeMode: (state, action: SetThemeModeAction) => {
      state.themeMode = action.payload.themeMode
      state.theme =
        action.payload.themeMode === ThemeMode.LIGHT
          ? Theme.LIGHT
          : action.payload.themeMode === ThemeMode.DARK
            ? Theme.DARK
            : Theme.AUTO
    },
    setSystemAppearance: (state, action: SetSystemAppearanceAction) => {
      state.systemAppearance = action.payload.systemAppearance
    }
  }
})

export const { setTheme, setThemePalette, setThemeMode, setSystemAppearance } =
  themeSlice.actions
export default themeSlice.reducer
export const actions = themeSlice.actions
