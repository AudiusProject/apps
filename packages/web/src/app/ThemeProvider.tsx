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
import { useDispatch, useSelector } from 'react-redux'

import { PREFERS_DARK_MEDIA_QUERY, THEME_PALETTE_KEY } from 'utils/theme/theme'

const { setSystemAppearance, setThemePalette } = themeActions

const { getTheme, getThemePalette, getThemeMode, getSystemAppearance } =
  themeSelectors

type ThemeProviderProps = {
  children: ReactNode
}

export const ThemeProvider = (props: ThemeProviderProps) => {
  const { children } = props
  const themePalette = useSelector(getThemePalette)
  const themeMode = useSelector(getThemeMode)
  const legacyTheme = useSelector(getTheme)
  const systemAppearance = useSelector(getSystemAppearance)
  const { isEnabled: isNewThemeModelEnabled } = useFeatureFlag(
    FeatureFlags.NEW_THEME_MODEL
  )
  const dispatch = useDispatch()

  const harmonyTheme = useMemo((): Theme => {
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

    if (isNewThemeModelEnabled) {
      return resolveTheme('default', mode, sysAppearance)
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
  }, [
    themePalette,
    themeMode,
    legacyTheme,
    systemAppearance,
    isNewThemeModelEnabled
  ])

  // Sync stored theme palette with feature flag: flag on → default, flag off → classic. Matrix unchanged.
  useEffect(() => {
    if (
      legacyTheme === LegacyTheme.MATRIX ||
      themePalette === ThemePalette.MATRIX
    ) {
      return
    }
    if (isNewThemeModelEnabled) {
      if (themePalette === null || themePalette === ThemePalette.CLASSIC) {
        dispatch(setThemePalette({ themePalette: ThemePalette.DEFAULT }))
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(THEME_PALETTE_KEY, ThemePalette.DEFAULT)
        }
      }
    } else {
      if (themePalette === ThemePalette.DEFAULT) {
        dispatch(setThemePalette({ themePalette: ThemePalette.CLASSIC }))
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(THEME_PALETTE_KEY, ThemePalette.CLASSIC)
        }
      }
    }
  }, [isNewThemeModelEnabled, themePalette, legacyTheme, dispatch])

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
