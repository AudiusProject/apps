import { useCallback, useEffect, useRef } from 'react'

import { useIsFocused } from '@react-navigation/native'
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'

import {
  useGlassHeaderInset,
  useGlassScrollHandler,
  useSyncGlassScroll
} from 'app/screens/app-screen/GlassChromeContext'

/**
 * Hooks a Library tab's list up to the scroll-away header. Each tab keeps its
 * own scroll position, so the focused tab drives the chrome and the header
 * jumps to match on tab switch.
 *
 * Returns the top inset the list's content needs to start below the header
 * and the `onScroll` handler to attach (with `scrollEventThrottle={16}`).
 */
export const useLibraryTabChrome = () => {
  const headerInset = useGlassHeaderInset()
  const handleGlassScroll = useGlassScrollHandler()
  const syncGlassScroll = useSyncGlassScroll()
  const isFocused = useIsFocused()
  const isFocusedRef = useRef(isFocused)
  isFocusedRef.current = isFocused
  const offsetRef = useRef(0)

  useEffect(() => {
    if (isFocused) syncGlassScroll(offsetRef.current)
  }, [isFocused, syncGlassScroll])

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offsetRef.current = event.nativeEvent.contentOffset.y
      if (isFocusedRef.current) handleGlassScroll(event)
    },
    [handleGlassScroll]
  )

  return { headerInset, onScroll }
}
