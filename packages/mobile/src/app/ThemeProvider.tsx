import type { ReactNode } from 'react'
import { useEffect, useMemo } from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import {
  Theme,
  ThemeMode,
  ThemePalette,
  SystemAppearance,
  LEGACY_THEME_DEFAULT
} from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { themeActions, themeSelectors } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAppState } from '@react-native-community/hooks'
import { useDarkMode } from 'react-native-dynamic'
import { useDispatch, useSelector } from 'react-redux'
import { useAsync } from 'react-use'

import { ThemeProvider as HarmonyThemeProvider } from '@audius/harmony-native'
import {
  THEME_MODE_KEY,
  THEME_PALETTE_KEY,
  THEME_STORAGE_KEY
} from 'app/constants/storage-keys'

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

export const ThemeProvider = (props: ThemeProviderProps) => {
  const { children } = props
  const isDarkMode = useDarkMode()
  const dispatch = useDispatch()
  const appState = useAppState()
  const theme = useSelector(getTheme)
  const themePalette = useSelector(getThemePalette)
  const themeMode = useSelector(getThemeMode)
  const systemAppearance = useSelector(getSystemAppearance)
  const { isEnabled: isNewThemeModelEnabled } = useFeatureFlag(
    FeatureFlags.NEW_THEME_MODEL
  )

  const harmonyTheme = useMemo((): HarmonyThemeName => {
    const mode: ThemeMode =
      themeMode ??
      (theme === Theme.LIGHT
        ? ThemeMode.LIGHT
        : theme === Theme.DARK
          ? ThemeMode.DARK
          : ThemeMode.AUTO)
    const sysAppearance: SystemAppearance =
      systemAppearance ??
      (theme === Theme.DARK ? SystemAppearance.DARK : SystemAppearance.LIGHT)

    if (themePalette != null) {
      return resolveToHarmonyTheme(themePalette, mode, sysAppearance)
    }

    if (isNewThemeModelEnabled) {
      return resolveToHarmonyTheme(ThemePalette.DEFAULT, mode, sysAppearance)
    }

    switch (theme) {
      case Theme.LIGHT:
        return 'classic-light'
      case Theme.DARK:
        return 'classic-dark'
      case Theme.MATRIX:
        return 'matrix'
      case Theme.AUTO:
      default:
        return sysAppearance === SystemAppearance.DARK
          ? 'classic-dark'
          : 'classic-light'
    }
  }, [theme, themePalette, themeMode, systemAppearance, isNewThemeModelEnabled])

  // Sync stored theme palette with feature flag: flag on → default, flag off → classic. Matrix unchanged.
  useEffect(() => {
    if (theme === Theme.MATRIX || themePalette === ThemePalette.MATRIX) {
      return
    }
    if (isNewThemeModelEnabled) {
      if (themePalette === null || themePalette === ThemePalette.CLASSIC) {
        dispatch(setThemePalette({ themePalette: ThemePalette.DEFAULT }))
      }
    } else {
      if (themePalette === ThemePalette.DEFAULT) {
        dispatch(setThemePalette({ themePalette: ThemePalette.CLASSIC }))
      }
    }
  }, [isNewThemeModelEnabled, themePalette, theme, dispatch])

  useAsync(async () => {
    const [savedTheme, savedPalette, savedMode] = await Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(THEME_PALETTE_KEY),
      AsyncStorage.getItem(THEME_MODE_KEY)
    ])

    // Handle legacy "default" value - treat as AUTO
    const theme =
      savedTheme === LEGACY_THEME_DEFAULT
        ? Theme.AUTO
        : ((savedTheme as Nullable<Theme>) ?? Theme.AUTO)

    dispatch(setTheme({ theme }))

    if (
      savedPalette &&
      Object.values(ThemePalette).includes(savedPalette as ThemePalette)
    ) {
      dispatch(setThemePalette({ themePalette: savedPalette as ThemePalette }))
    }
    if (
      savedMode &&
      Object.values(ThemeMode).includes(savedMode as ThemeMode)
    ) {
      dispatch(setThemeMode({ themeMode: savedMode as ThemeMode }))
    }
  }, [dispatch])

  useEffect(() => {
    // react-native-dynamic incorrectly sets dark-mode when in background
    if (appState === 'active') {
      dispatch(
        setSystemAppearance({
          systemAppearance: isDarkMode
            ? SystemAppearance.DARK
            : SystemAppearance.LIGHT
        })
      )
    }
  }, [isDarkMode, dispatch, appState])

  return (
    <HarmonyThemeProvider themeName={harmonyTheme}>
      {children}
    </HarmonyThemeProvider>
  )
}
