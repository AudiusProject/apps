import { useCallback, useRef } from 'react'

import LottieView from 'lottie-react-native'
import type AnimatedLottieView from 'lottie-react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { StyleSheet } from 'react-native'

import loadingSpinner from 'app/harmony-native/assets/animations/loadingSpinner.json'
import { useTheme } from 'app/harmony-native/foundations/theme'
import { useEnterForeground } from 'app/hooks/useAppState'

const styles = StyleSheet.create({
  spinner: {
    height: 24,
    width: 24
  }
})

export type LoadingSpinnerProps = {
  color?: string
  fill?: string
  style?: StyleProp<ViewStyle>
}

export const LoadingSpinner = (props: LoadingSpinnerProps) => {
  const { color: themeColors } = useTheme()
  const color = props.color ?? props.fill ?? themeColors.neutral.n400
  const ref = useRef<AnimatedLottieView>(null)

  useEnterForeground(
    useCallback(() => {
      ref.current?.play()
    }, [])
  )

  return (
    <LottieView
      ref={ref}
      style={[styles.spinner, props.style]}
      source={loadingSpinner}
      autoPlay
      loop
      colorFilters={[
        {
          keypath: 'Shape Layer 1',
          color
        },
        {
          keypath: 'Shape Layer 2',
          color
        }
      ]}
    />
  )
}
