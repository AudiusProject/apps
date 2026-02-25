import { Theme } from '@audius/common/models'
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native'
import { StyleSheet } from 'react-native'

import type { ResolvedThemeName, ThemeColors } from 'app/utils/theme'
import {
  matrixTheme,
  defaultTheme,
  darkTheme,
  defaultLightThemeColors,
  defaultDarkThemeColors,
  useThemeVariant
} from 'app/utils/theme'

import { spacing } from './spacing'
import { typography } from './typography'

type StylesOptions = {
  palette: ThemeColors
  typography: typeof typography
  spacing: typeof spacing
  type: Theme
}

type StyleTypes =
  | ImageStyle
  | ViewStyle
  | TextStyle
  | (ViewStyle & { fill: string })

export const makeStyles = <T extends Record<string, StyleTypes>>(
  styles: (options: StylesOptions) => T
): (() => T) => {
  const baseOptions = { spacing, typography }

  const defaultLightStylesheet = StyleSheet.create(
    styles({
      type: Theme.LIGHT,
      palette: defaultLightThemeColors,
      ...baseOptions
    })
  )

  const defaultDarkStylesheet = StyleSheet.create(
    styles({
      type: Theme.DARK,
      palette: defaultDarkThemeColors,
      ...baseOptions
    })
  )

  const classicLightStylesheet = StyleSheet.create(
    styles({
      type: Theme.LIGHT,
      palette: defaultTheme,
      ...baseOptions
    })
  )

  const classicDarkStylesheet = StyleSheet.create(
    styles({
      type: Theme.DARK,
      palette: darkTheme,
      ...baseOptions
    })
  )

  const matrixStylesheet = StyleSheet.create(
    styles({
      type: Theme.MATRIX,
      palette: matrixTheme,
      ...baseOptions
    })
  )

  const themedStylesheets: Record<ResolvedThemeName, T> = {
    'default-light': defaultLightStylesheet,
    'default-dark': defaultDarkStylesheet,
    'classic-light': classicLightStylesheet,
    'classic-dark': classicDarkStylesheet,
    matrix: matrixStylesheet
  }

  return function useStyles() {
    const themeVariant = useThemeVariant()
    return themedStylesheets[themeVariant]
  }
}
