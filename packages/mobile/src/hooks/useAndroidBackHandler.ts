import { useEffect, useRef } from 'react'

import { BackHandler } from 'react-native'

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
