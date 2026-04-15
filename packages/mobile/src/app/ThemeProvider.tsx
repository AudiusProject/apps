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
import { useColorScheme } from 'react-native'
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
    const sysAppearance =
      systemAppearance ??
      (theme === Theme.DARK ? SystemAppearance.DARK : SystemAppearance.LIGHT)
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
      switch (systemAppearance) {
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
  const colorScheme = useColorScheme()
  const dispatch = useDispatch()
  const appState = useAppState()
  const theme = useSelector(selectHarmonyTheme)
  const didInitSystemAppearanceRef = useRef(false)

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
    const isInitial = !didInitSystemAppearanceRef.current
    didInitSystemAppearanceRef.current = true

    // On subsequent changes, ignore appearance updates while in the background:
    // iOS briefly toggles the reported appearance when generating the app
    // switcher screenshot, which leaves the hook reporting a stale value.
    // On initial mount, always dispatch — when the app is launched directly
    // from a killed state (e.g. tapping a push notification),
    // AppState.currentState may not yet report 'active', and gating the first
    // dispatch would leave the theme stuck on light until the next foreground
    // transition.
    if (!isInitial && appState !== 'active') return

    dispatch(
      setSystemAppearance({
        systemAppearance:
          colorScheme === 'dark'
            ? SystemAppearance.DARK
            : SystemAppearance.LIGHT
      })
    )
  }, [colorScheme, dispatch, appState])

  return (
    <HarmonyThemeProvider themeName={theme}>{children}</HarmonyThemeProvider>
  )
}
