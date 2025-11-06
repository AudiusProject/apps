import { useCallback, useRef } from 'react'

import { convertHexToRGBA } from '@audius/common/utils'
import { Animated } from 'react-native'

export const useColorAnimation = (...colors: string[]) => {
  const colorAnim = useRef(new Animated.Value(0)).current

  const handlePressIn = useCallback(() => {
    Animated.timing(colorAnim, {
      toValue: 1,
      duration: 70,
      delay: 0,
      useNativeDriver: false
    }).start()
  }, [colorAnim])

  const handlePressOut = useCallback(() => {
    Animated.timing(colorAnim, {
      toValue: 0,
      duration: 70,
      delay: 0,
      useNativeDriver: false
    }).start()
  }, [colorAnim])

  const color = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: colors.map((color) => convertHexToRGBA(color))
  })

  return {
    color,
    handlePressIn,
    handlePressOut
  }
}
