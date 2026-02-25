import {
  SystemAppearance,
  Theme,
  ThemeMode,
  ThemePalette,
  LEGACY_THEME_DEFAULT
} from '@audius/common/models'
import { useSelector } from 'react-redux'

export const THEME_KEY = 'theme'
export const THEME_PALETTE_KEY = 'themePalette'
export const THEME_MODE_KEY = 'themeMode'
export const PREFERS_DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

const doesPreferDarkMode = () => {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia(PREFERS_DARK_MEDIA_QUERY).matches
  )
}

export const shouldShowDark = (theme?: Theme | null) => {
  return (
    !!theme &&
    (theme === Theme.DARK || (theme === Theme.AUTO && doesPreferDarkMode()))
  )
}

export const getTheme = (): Theme | null => {
  if (typeof window === 'undefined') return null

  const storedTheme = window.localStorage.getItem(THEME_KEY)

  // Handle legacy "default" value - treat as AUTO
  if (storedTheme === LEGACY_THEME_DEFAULT) {
    return Theme.AUTO
  }

  if (storedTheme && Object.values(Theme).includes(storedTheme as Theme)) {
    return storedTheme as Theme
  }

  return Theme.AUTO
}

/** Derive themePalette from stored theme (for migration from legacy) */
export const getThemePaletteFromStorage = (): ThemePalette | null => {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(THEME_PALETTE_KEY)
  if (stored && Object.values(ThemePalette).includes(stored as ThemePalette)) {
    return stored as ThemePalette
  }
  const theme = getTheme()
  if (theme === Theme.MATRIX) return ThemePalette.MATRIX
  return null
}

/** Derive themeMode from stored theme (for migration from legacy) */
export const getThemeModeFromStorage = (): ThemeMode | null => {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(THEME_MODE_KEY)
  if (stored && Object.values(ThemeMode).includes(stored as ThemeMode)) {
    return stored as ThemeMode
  }
  const theme = getTheme()
  if (theme === Theme.LIGHT) return ThemeMode.LIGHT
  if (theme === Theme.DARK) return ThemeMode.DARK
  return ThemeMode.AUTO
}

export const getSystemAppearance = () =>
  doesPreferDarkMode() ? SystemAppearance.DARK : SystemAppearance.LIGHT

export const isDarkMode = () => shouldShowDark(getTheme())
export const isMatrix = () => getTheme() === Theme.MATRIX

export const useIsDarkMode = () => {
  const theme = useSelector(getTheme)
  return shouldShowDark(theme)
}

export const useIsMatrix = () => {
  const theme = useSelector(getTheme)
  return theme === Theme.MATRIX
}

export const clearTheme = () => {
  window.localStorage.removeItem(THEME_KEY)
}
