import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'

import {
  Theme,
  ThemeMode,
  ThemePalette,
  SystemAppearance,
  LEGACY_THEME_DEFAULT
} from '@audius/common/models'
import { themeActions, themeSelectors } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAppState } from '@react-native-community/hooks'
import { Appearance, useColorScheme } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { useAsync } from 'react-use'

import { ThemeProvider as HarmonyThemeProvider } from '@audius/harmony-native'
import {
  THEME_MODE_KEY,
  THEME_PALETTE_KEY,
  THEME_STORAGE_KEY
} from 'app/constants/storage-keys'
import type { AppState } from 'app/store'

const { getTheme, getThemePalette, getThemeMode, getSystemAppearance } =
  themeSelectors
const { setTheme, setThemePalette, setThemeMode, setSystemAppearance } =
  themeActions

type ThemeProviderProps = {
  children: ReactNode
}

type HarmonyThemeName =
  | 'default-light'
  | 'default-dark'
  | 'classic-light'
  | 'classic-dark'
  | 'matrix'
  | 'day'
  | 'dark'

/**
 * Resolve palette + mode + system preference to concrete theme name.
 * Default palette uses Neue colors; Classic uses legacy day/dark.
 */
const resolveToHarmonyTheme = (
  palette: ThemePalette,
  mode: ThemeMode,
  systemAppearance: SystemAppearance
): HarmonyThemeName => {
  if (palette === ThemePalette.MATRIX) return 'matrix'
  const resolvedMode =
    mode === ThemeMode.AUTO
      ? systemAppearance === SystemAppearance.DARK
        ? 'dark'
        : 'light'
      : mode === ThemeMode.LIGHT
        ? 'light'
        : 'dark'
  if (palette === ThemePalette.DEFAULT) {
    return resolvedMode === 'light' ? 'default-light' : 'default-dark'
  }
  return resolvedMode === 'light' ? 'classic-light' : 'classic-dark'
}

// Fallback to the live system value when redux hasn't been seeded yet
// (e.g. on the very first render before ThemeProvider's effect has fired).
// Without this the first paint would force light even when the OS is dark.
const getCurrentSystemAppearance = (): SystemAppearance =>
  Appearance.getColorScheme() === 'dark'
    ? SystemAppearance.DARK
    : SystemAppearance.LIGHT

const selectHarmonyTheme = (state: AppState): HarmonyThemeName => {
  const theme = getTheme(state)
  const themePalette = getThemePalette(state)
  const themeMode = getThemeMode(state)
  const systemAppearance = getSystemAppearance(state)

  if (themePalette != null) {
    const mode =
      themeMode ??
      (theme === Theme.LIGHT
        ? ThemeMode.LIGHT
        : theme === Theme.DARK
          ? ThemeMode.DARK
          : ThemeMode.AUTO)
    const sysAppearance = systemAppearance ?? getCurrentSystemAppearance()
    return resolveToHarmonyTheme(themePalette, mode, sysAppearance)
  }

  // No stored palette (e.g. new account, incognito) — always use default (Neue) theme
  switch (theme) {
    case Theme.LIGHT:
      return 'default-light'
    case Theme.DARK:
      return 'default-dark'
    case Theme.MATRIX:
      return 'matrix'
    case Theme.AUTO:
    default:
      switch (systemAppearance ?? getCurrentSystemAppearance()) {
        case SystemAppearance.DARK:
          return 'default-dark'
        case SystemAppearance.LIGHT:
        default:
          return 'default-light'
      }
  }
}

export const ThemeProvider = (props: ThemeProviderProps) => {
  const { children } = props
  // useColorScheme from react-native synchronously returns the current
  // system value on first render (unlike react-native-dynamic's
  // useDarkMode, which can report stale `light` until its listener fires).
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === 'dark'
  const dispatch = useDispatch()
  const appState = useAppState()
  const theme = useSelector(selectHarmonyTheme)
  const hasInitializedSystemAppearanceRef = useRef(false)

  useAsync(async () => {
    const [savedTheme, savedPalette, savedMode] = await Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(THEME_PALETTE_KEY),
      AsyncStorage.getItem(THEME_MODE_KEY)
    ])

    const isLegacyTheme =
      savedTheme === LEGACY_THEME_DEFAULT ||
      savedTheme == null ||
      savedPalette == null ||
      savedPalette === ThemePalette.CLASSIC

    if (isLegacyTheme) {
      // Migrate: wipe legacy/classic and set everyone to default palette + auto
      await Promise.all([
        AsyncStorage.setItem(THEME_STORAGE_KEY, Theme.AUTO),
        AsyncStorage.setItem(THEME_PALETTE_KEY, ThemePalette.DEFAULT),
        AsyncStorage.setItem(THEME_MODE_KEY, ThemeMode.AUTO)
      ])
      dispatch(setTheme({ theme: Theme.AUTO }))
      dispatch(setThemePalette({ themePalette: ThemePalette.DEFAULT }))
      dispatch(setThemeMode({ themeMode: ThemeMode.AUTO }))
    } else {
      const theme =
        savedTheme === LEGACY_THEME_DEFAULT
          ? Theme.AUTO
          : ((savedTheme as Nullable<Theme>) ?? Theme.AUTO)
      dispatch(setTheme({ theme }))
      if (
        savedPalette &&
        Object.values(ThemePalette).includes(savedPalette as ThemePalette)
      ) {
        dispatch(
          setThemePalette({ themePalette: savedPalette as ThemePalette })
        )
      }
      if (
        savedMode &&
        Object.values(ThemeMode).includes(savedMode as ThemeMode)
      ) {
        dispatch(setThemeMode({ themeMode: savedMode as ThemeMode }))
      }
    }
  }, [dispatch])

  useEffect(() => {
    // iOS briefly reports dark-mode while generating the app-switcher
    // snapshot, so ignore changes when backgrounded. The very first
    // dispatch must always run so the initial render picks up the
    // system value even if appState hasn't settled to 'active' yet.
    if (appState !== 'active' && hasInitializedSystemAppearanceRef.current) {
      return
    }
    hasInitializedSystemAppearanceRef.current = true
    const currentScheme =
      Appearance.getColorScheme() ?? (isDarkMode ? 'dark' : 'light')
    dispatch(
      setSystemAppearance({
        systemAppearance:
          currentScheme === 'dark'
            ? SystemAppearance.DARK
            : SystemAppearance.LIGHT
      })
    )
  }, [isDarkMode, dispatch, appState])

  return (
    <HarmonyThemeProvider themeName={theme}>{children}</HarmonyThemeProvider>
  )
}
