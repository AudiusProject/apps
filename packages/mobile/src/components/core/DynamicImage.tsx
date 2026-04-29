import type { ReactNode } from 'react'

import type {
  ImageStyle,
  ImageSourcePropType,
  StyleProp,
  ViewStyle
} from 'react-native'
import { Animated, StyleSheet, View } from 'react-native'

import { Image } from '@audius/harmony-native'
import type { ImageProps } from '@audius/harmony-native'
import type { StylesProp } from 'app/styles'

export type DynamicImageProps = Omit<ImageProps, 'source'> & {
  source?: ImageSourcePropType
  /** Optional low-res placeholder for progressive loading. */
  priorityLowResSource?: ImageSourcePropType
  styles?: StylesProp<{
    root: ViewStyle
    imageContainer: ViewStyle
    image: ImageStyle
  }>
  style?: StyleProp<ViewStyle>
  /** When true, skip the fade-in animation. */
  immediate?: boolean
  /** Overlays rendered above the image. */
  children?: ReactNode
  /** Called once the image finishes loading. */
  onLoad?: () => void
  animatedValue?: Animated.Value
  firstOpacity?: number
  noSkeleton?: boolean
}

const styles = StyleSheet.create({
  imageContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  },
  children: {
    position: 'relative',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  }
})

const interpolateImageScale = (animatedValue: Animated.Value) =>
  animatedValue.interpolate({
    inputRange: [-200, 0],
    outputRange: [4, 1],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp'
  })

const interpolateImageTranslate = (animatedValue: Animated.Value) =>
  animatedValue.interpolate({
    inputRange: [-200, 0],
    outputRange: [-40, 0],
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

/**
 * DynamicImage — backwards-compatible wrapper around Harmony's Image
 * primitive. New code should prefer `<Image>` from `@audius/harmony-native`
 * directly. This wrapper preserves the legacy parallax `animatedValue`
 * behavior for hero-style cover images.
 */
export const DynamicImage = ({
  source,
  priorityLowResSource,
  style,
  styles: stylesProp,
  immediate,
  children,
  onLoad,
  animatedValue,
  noSkeleton: _noSkeleton,
  firstOpacity: _firstOpacity,
  ...imageProps
}: DynamicImageProps) => {
  return (
    <Animated.View
      pointerEvents={children ? undefined : 'none'}
      style={[
        stylesProp?.root,
        style,
        animatedValue
          ? {
              transform: [
                { scale: interpolateImageScale(animatedValue) },
                { translateY: interpolateImageTranslate(animatedValue) }
              ]
            }
          : {}
      ]}
    >
      <View style={[stylesProp?.imageContainer, styles.imageContainer]}>
        <Image
          source={source}
          priorityLowResSource={priorityLowResSource}
          immediate={immediate}
          onLoad={() => onLoad?.()}
          style={[{ width: '100%', height: '100%' }, stylesProp?.image]}
          {...imageProps}
        />
      </View>
      {children ? <View style={styles.children}>{children}</View> : null}
    </Animated.View>
  )
}
