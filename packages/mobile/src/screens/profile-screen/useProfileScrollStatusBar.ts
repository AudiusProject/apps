import { useCallback, useEffect, useRef } from 'react'

import { useFocusEffect } from '@react-navigation/native'
import type { StatusBarProps } from 'react-native-bars'
import { NavigationBar, StatusBar as RNStatusBar } from 'react-native-bars'
import type { SharedValue } from 'react-native-reanimated'
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated'

import { isDarkTheme, useThemeVariant } from 'app/utils/theme'

import { PROFILE_NAV_SCROLL_FADE_PX } from './ProfileNavOverlay'

/**
 * Status bar / nav bar style for profile: light icons over the cover at the
 * top, then switch to icons that contrast with the blurred nav bar surface
 * once the header has scrolled up — dark icons on the light-blur surface in
 * light mode, light icons on the dark-blur surface in dark mode.
 */
export const useProfileScrollStatusBar = (scrollY: SharedValue<number>) => {
  const statusBarEntryRef = useRef<StatusBarProps | null>(null)
  const navigationBarEntryRef = useRef<StatusBarProps | null>(null)
  const lastBarStyleRef = useRef<'light-content' | 'dark-content' | null>(null)
  const isDarkMode = isDarkTheme(useThemeVariant())
  const scrolledBarStyle: 'light-content' | 'dark-content' = isDarkMode
    ? 'light-content'
    : 'dark-content'

  const applyBarStyle = useCallback(
    (barStyle: 'light-content' | 'dark-content') => {
      if (!statusBarEntryRef.current || !navigationBarEntryRef.current) {
        return
      }
      if (lastBarStyleRef.current === barStyle) {
        return
      }
      lastBarStyleRef.current = barStyle
      statusBarEntryRef.current = RNStatusBar.replaceStackEntry(
        statusBarEntryRef.current,
        { barStyle }
      )
      navigationBarEntryRef.current = NavigationBar.replaceStackEntry(
        navigationBarEntryRef.current,
        { barStyle }
      )
    },
    []
  )

  useFocusEffect(
    useCallback(() => {
      lastBarStyleRef.current = null
      statusBarEntryRef.current = RNStatusBar.pushStackEntry({
        barStyle: 'light-content'
      })
      navigationBarEntryRef.current = NavigationBar.pushStackEntry({
        barStyle: 'light-content'
      })

      // Align with restored scroll position (reaction only fires on change).
      requestAnimationFrame(() => {
        const barStyle =
          scrollY.value < PROFILE_NAV_SCROLL_FADE_PX
            ? 'light-content'
            : scrolledBarStyle
        applyBarStyle(barStyle)
      })

      return () => {
        lastBarStyleRef.current = null
        if (statusBarEntryRef.current) {
          RNStatusBar.popStackEntry(statusBarEntryRef.current)
          statusBarEntryRef.current = null
        }
        if (navigationBarEntryRef.current) {
          NavigationBar.popStackEntry(navigationBarEntryRef.current)
          navigationBarEntryRef.current = null
        }
      }
    }, [applyBarStyle, scrollY, scrolledBarStyle])
  )

  useAnimatedReaction(
    () => scrollY.value,
    (y, prev) => {
      const atTop = y < PROFILE_NAV_SCROLL_FADE_PX
      const barStyle = atTop ? 'light-content' : scrolledBarStyle
      const prevY = prev ?? 0
      const prevAtTop = prevY < PROFILE_NAV_SCROLL_FADE_PX
      if (atTop !== prevAtTop) {
        runOnJS(applyBarStyle)(barStyle)
      }
    },
    [applyBarStyle, scrolledBarStyle]
  )

  // Re-apply when the theme changes while the screen is already scrolled —
  // otherwise the status bar stays on the previous mode's content style
  // until the user scrolls across the fade threshold again.
  useEffect(() => {
    if (scrollY.value < PROFILE_NAV_SCROLL_FADE_PX) return
    applyBarStyle(scrolledBarStyle)
  }, [applyBarStyle, scrolledBarStyle, scrollY])
}
