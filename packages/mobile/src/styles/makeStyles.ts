import { Theme } from '@audius/common/models'
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native'
import { StyleSheet } from 'react-native'

import type { ThemeColors } from 'app/utils/theme'
import {
  matrixTheme,
  defaultTheme,
  darkTheme,
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

  const lightStylesheet = StyleSheet.create(
    styles({
      type: Theme.LIGHT,
      palette: defaultTheme,
      ...baseOptions
    })
  )

  const darkStylesheet = StyleSheet.create(
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

  const themedStylesheets = {
    [Theme.LIGHT]: lightStylesheet,
    [Theme.DARK]: darkStylesheet,
    [Theme.MATRIX]: matrixStylesheet
  }

  return function useStyles() {
    const themeVariant = useThemeVariant()
    return themedStylesheets[themeVariant]
  }
}
