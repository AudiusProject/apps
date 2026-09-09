import { useMemo, useRef } from 'react'

import type { DimensionValue, StyleProp, ViewStyle } from 'react-native'
import { Animated, Easing, View } from 'react-native'

import { LinearGradient } from '@audius/harmony-native'
import { makeStyles } from 'app/styles'
import { getGradientStartEnd } from 'app/utils/linearGradient'
import { useThemeColors } from 'app/utils/theme'

const ANIMATION_DURATION_MS = 1500

type SkeletonProps = {
  // Width (css string) of the skeleton to display. Default 100%.
  width?: DimensionValue
  // Height (css string) of the skeleton to display. Default 100%.
  height?: DimensionValue
  // Optional style to pass in and override styles with
  style?: StyleProp<ViewStyle>
  noShimmer?: boolean
}

const useStyles = makeStyles(({ palette }) => ({
  view: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 4
  },
  skeleton: {
    position: 'absolute',
    width: '400%',
    height: '100%',
    backgroundColor: palette.skeleton
  }
}))

export const Skeleton = (props: SkeletonProps) => {
  const { width, height, style, noShimmer } = props
  const styles = useStyles()
  const shimmerPos = useRef(new Animated.Value(0)).current
  const { skeleton, skeletonHighlight } = useThemeColors()

  const shimmer = useMemo(
    () =>
      Animated.loop(
        Animated.timing(shimmerPos, {
          toValue: 0,
          duration: ANIMATION_DURATION_MS,
          useNativeDriver: true,
          easing: Easing.ease
        })
      ),
    [shimmerPos]
  )

  return (
    <View style={[styles.view, { height, width }, style]}>
      <Animated.View
        onLayout={(e) => {
          if (noShimmer) return
          const { width } = e.nativeEvent.layout
          shimmerPos.setValue(-0.75 * width)
          shimmer.start()
        }}
        style={[styles.skeleton, { transform: [{ translateX: shimmerPos }] }]}
      >
        <LinearGradient
          {...getGradientStartEnd(90)}
          locations={[0, 0.32, 0.46, 0.54, 0.68, 1]}
          colors={[
            skeleton,
            skeleton,
            skeletonHighlight,
            skeletonHighlight,
            skeleton,
            skeleton
          ]}
          style={{ height: '100%', width: '100%' }}
        />
      </Animated.View>
    </View>
  )
}

type StaticSkeletonProps = SkeletonProps

export const StaticSkeleton = (props: StaticSkeletonProps) => {
  return <Skeleton noShimmer {...props} />
}

export default Skeleton
