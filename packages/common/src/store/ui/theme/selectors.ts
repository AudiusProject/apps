import { ThemePalette } from '~/models/Theme'
import { CommonState } from '~/store/commonStore'

const getBaseState = (state: CommonState) => state.ui.theme

export const getTheme = (state: CommonState) => {
  return getBaseState(state).theme
}

/** Palette from dropdown (default, classic, matrix). UI defaults to default when null. */
export const getThemePalette = (state: CommonState): ThemePalette | null => {
  return getBaseState(state).themePalette
}

/** Mode from segmented control (auto, light, dark). */
export const getThemeMode = (state: CommonState) => {
  return getBaseState(state).themeMode
}

export const getSystemAppearance = (state: CommonState) => {
  return getBaseState(state).systemAppearance
}
