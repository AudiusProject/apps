import { useCallback, useEffect, useRef } from 'react'

import { useFocusEffect } from '@react-navigation/native'
import type { StatusBarProps } from 'react-native-bars'
import { NavigationBar, StatusBar as RNStatusBar } from 'react-native-bars'
import type { SharedValue } from 'react-native-reanimated'
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated'

import { isDarkTheme, useThemeVariant } from 'app/utils/theme'

import { CONTEST_NAV_SCROLL_FADE_PX } from './ContestNavOverlay'

export const useContestScrollStatusBar = (scrollY: SharedValue<number>) => {
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

      requestAnimationFrame(() => {
        const barStyle =
          scrollY.value < CONTEST_NAV_SCROLL_FADE_PX
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
      const atTop = y < CONTEST_NAV_SCROLL_FADE_PX
      const barStyle = atTop ? 'light-content' : scrolledBarStyle
      const prevY = prev ?? 0
      const prevAtTop = prevY < CONTEST_NAV_SCROLL_FADE_PX
      if (atTop !== prevAtTop) {
        runOnJS(applyBarStyle)(barStyle)
      }
    },
    [applyBarStyle, scrolledBarStyle]
  )

  useEffect(() => {
    if (scrollY.value < CONTEST_NAV_SCROLL_FADE_PX) return
    applyBarStyle(scrolledBarStyle)
  }, [applyBarStyle, scrolledBarStyle, scrollY])
}
