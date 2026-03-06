import { ReactNode, useEffect } from 'react'

import {
  SystemAppearance,
  Theme as LegacyTheme,
  ThemeMode,
  ThemePalette
} from '@audius/common/models'
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

export const ThemeProvider = (props: ThemeProviderProps) => {
  const { children } = props
  const harmonyTheme = useSelector(selectHarmonyTheme)
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
