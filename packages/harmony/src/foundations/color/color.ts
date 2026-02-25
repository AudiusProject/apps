import { primitiveTheme } from './primitive'
import { semanticTheme } from './semantic'

export const colorTheme = {
  defaultLight: {
    ...primitiveTheme.defaultLight,
    ...semanticTheme.defaultLight
  },
  defaultDark: {
    ...primitiveTheme.defaultDark,
    ...semanticTheme.defaultDark
  },
  classicLight: {
    ...primitiveTheme.classicLight,
    ...semanticTheme.classicLight
  },
  classicDark: {
    ...primitiveTheme.classicDark,
    ...semanticTheme.classicDark
  },
  matrix: {
    ...primitiveTheme.matrix,
    ...semanticTheme.matrix
  },
  /** @deprecated Use classicLight */
  day: {
    ...primitiveTheme.day,
    ...semanticTheme.day
  },
  /** @deprecated Use classicDark */
  dark: {
    ...primitiveTheme.dark,
    ...semanticTheme.dark
  }
}

export type ColorTheme = typeof colorTheme
