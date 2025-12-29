import type { ComponentProps } from 'react'

import { Image as RNImage, type ImageSourcePropType } from 'react-native'
import TurboImage from 'react-native-turbo-image'

export type ImageProps = Omit<
  ComponentProps<typeof TurboImage>,
  'source' | 'onLoad' | 'style'
> & {
  source?: ImageSourcePropType
  onLoad?: () => void
  style?: ComponentProps<typeof TurboImage>['style']
}

// Export ImageProps without source for render prop usage
export type ImagePropsWithoutSource = Omit<ImageProps, 'source'>

/**
 * Utility component that wraps react-native-turbo-image
 */
export const Image = (props: ImageProps) => {
  const { source, onLoad, ...other } = props

  // Use React Native Image for local assets (number sources)
  if (typeof source === 'number') {
    // Only pass React Native Image compatible props
    const {
      style,
      resizeMode,
      testID,
      accessibilityLabel,
      accessibilityHint,
      accessibilityRole,
      accessibilityState,
      accessibilityValue,
      accessible
    } = other as ComponentProps<typeof TurboImage>
    return (
      <RNImage
        source={source}
        onLoad={onLoad}
        style={style}
        resizeMode={resizeMode}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
        accessibilityValue={accessibilityValue}
        accessible={accessible}
      />
    )
  }

  if (!source) {
    return null
  }

  const imageSource = Array.isArray(source)
    ? { uri: source[0].uri ?? '' }
    : { uri: source.uri ?? '' }

  if (!imageSource.uri) {
    return null
  }

  // TurboImage uses onSuccess instead of onLoad
  // Extract style to ensure it's always provided
  const { style, ...restOther } = other
  const turboProps = onLoad
    ? { ...restOther, onSuccess: () => onLoad() }
    : restOther

  return <TurboImage source={imageSource} style={style ?? {}} {...turboProps} />
}

/**
 * Prefetch images using TurboImage.prefetch
 * Returns a Promise that resolves when prefetching is complete
 * Throws an error if prefetching fails
 */
export const preload = async (
  sources: Array<{ uri: string }>
): Promise<void> => {
  const success = await TurboImage.prefetch(sources)
  if (!success) {
    throw new Error(
      `Failed to prefetch images: ${sources.map((s) => s.uri).join(', ')}`
    )
  }
}
