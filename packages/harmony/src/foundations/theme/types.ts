import { Interpolation } from '@emotion/react'

import { HarmonyTheme } from './theme'

/** Resolved theme - which palette + mode combination to display */
export type Theme =
  | 'default-light'
  | 'default-dark'
  | 'classic-light'
  | 'classic-dark'
  | 'matrix'
  /** @deprecated Use classic-light */
  | 'day'
  /** @deprecated Use classic-dark */
  | 'dark'

/** Theme palette - selected in dropdown (default, classic, matrix) */
export type ThemePalette = 'default' | 'classic' | 'matrix'

/** Color mode - auto follows system, light/dark are explicit */
export type ThemeMode = 'auto' | 'light' | 'dark'

export type WithCSS<T> = T & { css?: Interpolation<HarmonyTheme> }
