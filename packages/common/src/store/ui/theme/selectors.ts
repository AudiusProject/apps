import { ThemePalette } from '~/models/Theme'
import { CommonState } from '~/store/commonStore'

const getBaseState = (state: CommonState) => state.ui.theme

export const getTheme = (state: CommonState) => {
  return getBaseState(state).theme
}

export const getThemePalette = (state: CommonState): ThemePalette | null => {
  return getBaseState(state).themePalette
}

export const getThemeMode = (state: CommonState) => {
  return getBaseState(state).themeMode
}

export const getFrostedSurfaceIntensity = (state: CommonState) => {
  return getBaseState(state).frostedSurfaceIntensity
}

export const getSystemAppearance = (state: CommonState) => {
  return getBaseState(state).systemAppearance
}
