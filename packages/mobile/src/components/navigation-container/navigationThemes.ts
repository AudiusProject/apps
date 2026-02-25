import type { Theme } from '@react-navigation/native'
import { DefaultTheme, DarkTheme } from '@react-navigation/native'

import type { ResolvedThemeName } from 'app/utils/theme'
import {
  darkTheme,
  defaultTheme,
  matrixTheme,
  defaultLightThemeColors,
  defaultDarkThemeColors
} from 'app/utils/theme'

const createLightNavTheme = (palette: {
  background: string
  white: string
}) => ({
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.background,
    card: palette.white
  }
})

const createDarkNavTheme = (palette: {
  background: string
  white: string
}) => ({
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: palette.background,
    card: palette.white
  }
})

export const navigationThemes: Record<ResolvedThemeName, Theme> = {
  'default-light': createLightNavTheme(defaultLightThemeColors),
  'default-dark': createDarkNavTheme(defaultDarkThemeColors),
  'classic-light': createLightNavTheme(defaultTheme),
  'classic-dark': createDarkNavTheme(darkTheme),
  matrix: createDarkNavTheme(matrixTheme)
}
