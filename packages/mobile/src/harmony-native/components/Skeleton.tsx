import { useEffect } from 'react'

import { useTheme } from '@emotion/react'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing
} from 'react-native-reanimated'

import { Box } from './layout/Box/Box'
import type { BoxProps } from './layout/Box/types'

const AnimatedBox = Animated.createAnimatedComponent(Box)

type SkeletonProps = BoxProps & {
  noShimmer?: boolean
}

export const Skeleton = (props: SkeletonProps) => {
  const { noShimmer, ...rest } = props
  const { color } = useTheme()
  const color1 = color.neutral.n50
  const color2 = color.neutral.n100

  const shimmerPosition = useSharedValue(0)

  useEffect(() => {
    if (noShimmer) return
    shimmerPosition.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1500,
          easing: Easing.linear
        }),
        withTiming(0, {
          duration: 0
        })
      ),
      -1
    )
  }, [shimmerPosition, noShimmer])

  const shimmerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: shimmerPosition.value * -200 + 100
        }
      ]
    }
  })

  if (noShimmer) {
    return (
      <Box
        {...rest}
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: color1
          },
          rest.style
        ]}
      />
    )
  }

  return (
    <AnimatedBox
      {...rest}
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: color1,
          overflow: 'hidden'
        },
        rest.style
      ]}
    >
      <AnimatedBox
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: color2,
            opacity: 0.5
          },
          shimmerStyle
        ]}
      />
    </AnimatedBox>
  )
}
