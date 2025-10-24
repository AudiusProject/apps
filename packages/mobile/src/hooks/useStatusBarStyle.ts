import { useCallback, useRef } from 'react'

import { useFocusEffect } from '@react-navigation/native'
import type { StatusBarProps } from 'react-native-bars'
import { StatusBar as RNStatusBar, NavigationBar } from 'react-native-bars'

/**
 * Hook to set status bar style when screen is focused
 * @param barStyle - 'light-content' for dark backgrounds, 'dark-content' for light backgrounds
 */
export const useStatusBarStyle = (
  barStyle: 'light-content' | 'dark-content'
) => {
  const statusBarEntryRef = useRef<StatusBarProps | null>(null)
  const navigationBarEntryRef = useRef<StatusBarProps | null>(null)

  useFocusEffect(
    useCallback(() => {
      // Set status bar style when screen is focused
      statusBarEntryRef.current = RNStatusBar.pushStackEntry({ barStyle })
      navigationBarEntryRef.current = NavigationBar.pushStackEntry({ barStyle })

      // Cleanup: restore default when screen loses focus
      return () => {
        if (statusBarEntryRef.current) {
          RNStatusBar.popStackEntry(statusBarEntryRef.current)
          statusBarEntryRef.current = null
        }
        if (navigationBarEntryRef.current) {
          NavigationBar.popStackEntry(navigationBarEntryRef.current)
          navigationBarEntryRef.current = null
        }
      }
    }, [barStyle])
  )
}
