import { ReactNode, useEffect } from 'react'

import { Theme, SystemAppearance } from '@audius/common/models'
import { themeActions, themeSelectors } from '@audius/common/store'
import { ThemeProvider as HarmonyThemeProvider } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { AppState } from 'store/types'
import { useSelector } from 'utils/reducer'
import { PREFERS_DARK_MEDIA_QUERY } from 'utils/theme/theme'

const { setSystemAppearance } = themeActions

const { getTheme, getSystemAppearance } = themeSelectors

const selectHarmonyTheme = (state: AppState) => {
  const theme = getTheme(state)
  const systemAppearance = getSystemAppearance(state)

  switch (theme) {
    case Theme.DEFAULT:
      return 'day'
    case Theme.DARK:
      return 'dark'
    case Theme.MATRIX:
      return 'matrix'
    case Theme.AUTO:
      switch (systemAppearance) {
        case SystemAppearance.DARK:
          return 'dark'
        case SystemAppearance.LIGHT:
          return 'day'
        default:
          return 'day'
      }
    default:
      return 'day'
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
