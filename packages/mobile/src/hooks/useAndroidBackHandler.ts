import { useEffect, useRef } from 'react'

import { BackHandler } from 'react-native'

/**
 * Consumes the Android hardware back press while `enabled` is true.
 * BackHandler runs the most recently added listener first, so an overlay
 * that opens later takes priority over react-navigation and earlier overlays.
 */
export const useAndroidBackHandler = (enabled: boolean, onBack: () => void) => {
  const onBackRef = useRef(onBack)
  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])

  useEffect(() => {
    if (!enabled) return
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onBackRef.current()
        return true
      }
    )
    return () => subscription.remove()
  }, [enabled])
}
