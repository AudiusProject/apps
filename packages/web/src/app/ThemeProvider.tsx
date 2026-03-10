import { ReactNode, useEffect, useMemo } from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import {
  SystemAppearance,
  Theme as LegacyTheme,
  ThemeMode,
  ThemePalette
} from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { themeActions, themeSelectors } from '@audius/common/store'
import {
  resolveTheme,
  ThemeProvider as HarmonyThemeProvider
} from '@audius/harmony'
import type { Theme } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { AppState } from 'store/types'
import { useSelector } from 'utils/reducer'
import { PREFERS_DARK_MEDIA_QUERY } from 'utils/theme/theme'

const { setSystemAppearance } = themeActions

const { getTheme, getThemePalette, getThemeMode, getSystemAppearance } =
  themeSelectors

const selectHarmonyTheme = (state: AppState): Theme => {
  const themePalette = getThemePalette(state)
  const themeMode = getThemeMode(state)
  const legacyTheme = getTheme(state)
  const systemAppearance = getSystemAppearance(state)

  const sysAppearance: 'light' | 'dark' =
    systemAppearance === SystemAppearance.DARK ? 'dark' : 'light'
  const mode: 'auto' | 'light' | 'dark' =
    themeMode === ThemeMode.AUTO
      ? 'auto'
      : themeMode === ThemeMode.DARK
        ? 'dark'
        : 'light'

  if (themePalette != null) {
    const palette: 'default' | 'classic' | 'matrix' =
      themePalette === ThemePalette.DEFAULT
        ? 'default'
        : themePalette === ThemePalette.MATRIX
          ? 'matrix'
          : 'classic'
    return resolveTheme(palette, mode, sysAppearance)
  }

  switch (legacyTheme) {
    case LegacyTheme.LIGHT:
      return 'classic-light'
    case LegacyTheme.DARK:
      return 'classic-dark'
    case LegacyTheme.MATRIX:
      return 'matrix'
    case LegacyTheme.AUTO:
      return sysAppearance === 'dark' ? 'classic-dark' : 'classic-light'
    default:
      return sysAppearance === 'dark' ? 'default-dark' : 'default-light'
  }
}

type ThemeProviderProps = {
  children: ReactNode
}

/**
 * When new theme flag is on: classic-* → default-* (upgrade).
 * When new theme flag is off: default-* → classic-* (downgrade).
 * Matrix is unchanged.
 */
const applyThemeFlag = (
  theme: Theme,
  isNewThemeModelEnabled: boolean
): Theme => {
  if (isNewThemeModelEnabled) {
    if (theme === 'classic-light') return 'default-light'
    if (theme === 'classic-dark') return 'default-dark'
  } else {
    if (theme === 'default-light') return 'classic-light'
    if (theme === 'default-dark') return 'classic-dark'
  }
  return theme
}

export const ThemeProvider = (props: ThemeProviderProps) => {
  const { children } = props
  const harmonyThemeFromState = useSelector(selectHarmonyTheme)
  const { isEnabled: isNewThemeModelEnabled } = useFeatureFlag(
    FeatureFlags.NEW_THEME_MODEL
  )
  const harmonyTheme = useMemo(
    () => applyThemeFlag(harmonyThemeFromState, isNewThemeModelEnabled),
    [harmonyThemeFromState, isNewThemeModelEnabled]
  )
  const dispatch = useDispatch()

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }
    const mediaQuery = window.matchMedia(PREFERS_DARK_MEDIA_QUERY)

    // Function to update state based on media query
    const handleSystemAppearanceChange = (e: MediaQueryListEvent) => {
      dispatch(
        setSystemAppearance({
          systemAppearance: e.matches
            ? SystemAppearance.DARK
            : SystemAppearance.LIGHT
        })
      )
    }

    mediaQuery.addListener(handleSystemAppearanceChange)

    return () => {
      mediaQuery.removeListener(handleSystemAppearanceChange)
    }
  }, [dispatch])

  return (
    <HarmonyThemeProvider theme={harmonyTheme}>{children}</HarmonyThemeProvider>
  )
}
