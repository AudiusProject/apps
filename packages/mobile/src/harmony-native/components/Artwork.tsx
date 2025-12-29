import { useEffect, useState } from 'react'

import { useTheme } from '@emotion/react'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'

import { Image } from './Image/Image'
import type { ImageProps } from './Image/Image'
import { Skeleton } from './Skeleton'
import { Box } from './layout/Box/Box'
import type { BoxProps } from './layout/Box/types'
import { Flex } from './layout/Flex/Flex'

const AnimatedImage = Animated.createAnimatedComponent(Image)

export type ArtworkProps = {
  isLoading?: boolean
  borderWidth?: number
  'data-testid'?: string
  noLoading?: boolean
} & Partial<Pick<ImageProps, 'source'>> &
  BoxProps

/**
 * The artwork component displays entity content and appears in several
 * locations such as track tiles, track and playlist, pages,
 * and the sidebar. It can have interactive elements on hover.
 * This component enhances the listening experience and helps users quickly
 * identify their favorite tracks.
 */
export const Artwork = (props: ArtworkProps) => {
  const {
    isLoading: isLoadingProp,
    source,
    borderRadius = 's',
    borderWidth,
    shadow,
    children,
    'data-testid': testId,
    ...other
  } = props
  const [isLoadingState, setIsLoadingState] = useState(true)
  const isLoading = isLoadingProp ?? isLoadingState
  const { color, cornerRadius, motion } = useTheme()

  const imageSource = !source
    ? source
    : typeof source === 'number'
      ? source
      : Array.isArray(source)
        ? { uri: source[0].uri }
        : { uri: source.uri }

  const hasImageSource = typeof imageSource === 'number' || imageSource?.uri

  // Create shared value for opacity
  const opacity = useSharedValue(0)

  // Create animated style
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }))

  // Animate opacity when loading state changes
  useEffect(() => {
    if (!isLoading) {
      opacity.value = withTiming(1, motion.expressive)
    } else {
      opacity.value = 0
    }
  }, [isLoading, opacity, motion.expressive])

  return (
    <Box {...other}>
      <Box
        borderRadius={borderRadius}
        border='default'
        shadow={shadow}
        style={{ borderWidth }}
      >
        {isLoading && hasImageSource ? (
          <Skeleton
            borderRadius={borderRadius}
            h='100%'
            w='100%'
            style={{
              zIndex: 2,
              position: 'absolute'
            }}
          />
        ) : null}
        <Box
          w='100%'
          pt='100%'
          borderRadius={borderRadius}
          style={{
            backgroundColor:
              !hasImageSource && children
                ? color.neutral.n400
                : color.background.surface2
          }}
        />
        {hasImageSource ? (
          <AnimatedImage
            testID={testId}
            style={[
              {
                height: '100%',
                width: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                borderRadius: cornerRadius[borderRadius]
              },
              animatedStyle
            ]}
            onLoad={() => {
              setIsLoadingState(false)
            }}
            source={imageSource}
          />
        ) : null}
        {children ? (
          <Flex
            alignItems='center'
            justifyContent='center'
            h='100%'
            w='100%'
            borderRadius={borderRadius}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              backgroundColor: hasImageSource ? color.static.black : undefined,
              opacity: hasImageSource ? 0.4 : undefined,
              zIndex: 1
            }}
          >
            {children}
          </Flex>
        ) : null}
      </Box>
    </Box>
  )
}
