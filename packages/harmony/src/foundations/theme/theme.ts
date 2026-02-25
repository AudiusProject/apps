import type { ColorTheme } from '../color'
import { colorTheme } from '../color'
import { CornerRadius, cornerRadius } from '../corner-radius'
import { Motion, motion, Spring, spring } from '../motion'
import { Shadows, shadows } from '../shadows'
import { Spacing, spacing, iconSizes } from '../spacing'
import { typography } from '../typography'
import type { Typography } from '../typography'

import type { Theme, ThemeMode, ThemePalette } from './types'

const commonFoundations = {
  shadows,
  typography,
  cornerRadius,
  spacing,
  motion,
  spring,
  iconSizes
}

export type HarmonyTheme = {
  type: Theme
  color: ColorTheme[keyof ColorTheme]
  shadows: Shadows
  typography: Typography
  cornerRadius: CornerRadius
  spacing: Spacing
  motion: Motion
  spring: Spring
  iconSizes: typeof iconSizes
}

export const defaultLightTheme: HarmonyTheme = {
  type: 'default-light',
  color: colorTheme.defaultLight,
  ...commonFoundations
}

export const defaultDarkTheme: HarmonyTheme = {
  type: 'default-dark',
  color: colorTheme.defaultDark,
  ...commonFoundations
}

export const classicLightTheme: HarmonyTheme = {
  type: 'classic-light',
  color: colorTheme.classicLight,
  ...commonFoundations
}

export const classicDarkTheme: HarmonyTheme = {
  type: 'classic-dark',
  color: colorTheme.classicDark,
  ...commonFoundations
}

export const matrixTheme: HarmonyTheme = {
  type: 'matrix',
  color: colorTheme.matrix,
  ...commonFoundations
}

export const themes: Record<Theme, HarmonyTheme> = {
  'default-light': defaultLightTheme,
  'default-dark': defaultDarkTheme,
  'classic-light': classicLightTheme,
  'classic-dark': classicDarkTheme,
  matrix: matrixTheme,
  /** @deprecated Use classicLightTheme */
  day: classicLightTheme,
  /** @deprecated Use classicDarkTheme */
  dark: classicDarkTheme
}

/** System light/dark preference for auto mode */
export type SystemAppearance = 'light' | 'dark'

/**
 * Resolve palette + mode + system preference to a concrete Theme.
 * Use when palette is default/classic and mode is auto/light/dark.
 * For matrix palette, mode is ignored.
 */
export function resolveTheme(
  palette: ThemePalette,
  mode: ThemeMode,
  systemAppearance: SystemAppearance
): Theme {
  if (palette === 'matrix') return 'matrix'
  const resolvedMode = mode === 'auto' ? systemAppearance : mode
  if (palette === 'default') {
    return resolvedMode === 'light' ? 'default-light' : 'default-dark'
  }
  return resolvedMode === 'light' ? 'classic-light' : 'classic-dark'
}

/** Check if theme is a light variant (light backgrounds) */
export const isLightTheme = (theme: Theme): boolean =>
  theme === 'default-light' || theme === 'classic-light' || theme === 'day'

/** Check if theme is a dark variant (dark backgrounds, including matrix) */
export const isDarkTheme = (theme: Theme): boolean =>
  theme === 'default-dark' ||
  theme === 'classic-dark' ||
  theme === 'dark' ||
  theme === 'matrix'
