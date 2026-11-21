import { useState, useEffect, useCallback } from 'react'

import type { AppStateStatus } from 'react-native'
import { AppState } from 'react-native'

type OnEnterForeground = () => any
type OnEnterBackground = () => any

const NotActive = /inactive|background/g

export const useAppState = (
  onEnterForeground: OnEnterForeground | null,
  onEnterBackground: OnEnterBackground | null
) => {
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState
  )
  const handleAppStateChange = useCallback(
    (nextAppState) => {
      if (
        appState.match(NotActive) &&
        nextAppState === 'active' &&
        onEnterForeground
      ) {
        onEnterForeground()
      }
      if (
        appState === 'active' &&
        nextAppState.match(NotActive) &&
        onEnterBackground
      ) {
        onEnterBackground()
      }
      setAppState(nextAppState)
    },
    [appState, onEnterForeground, onEnterBackground]
  )

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    )
    return () => subscription.remove()
  }, [handleAppStateChange])

  return appState
}

export const useEnterForeground = (onEnterForeground: OnEnterForeground) => {
  return useAppState(onEnterForeground, null)
}

export const useEnterBackground = (onEnterBackground: OnEnterBackground) => {
  return useAppState(null, onEnterBackground)
}

export default useAppState
