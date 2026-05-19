import { type ComponentProps, useEffect, useRef, useState } from 'react'

import {
  Image as RNImage,
  type ImageErrorEventData,
  type ImageLoadEventData,
  type ImageSourcePropType,
  type NativeSyntheticEvent,
  StyleSheet,
  View
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'

const AnimatedRNImage = Animated.createAnimatedComponent(RNImage)

export type ImageProps = ComponentProps<typeof RNImage> & {
  source?: ImageSourcePropType
  /**
   * Optional low-resolution placeholder source. When provided, this image is
   * shown immediately while the high-res `source` loads, then crossfades out
   * once the high-res image is ready. Enables true progressive image loading.
   */
  priorityLowResSource?: ImageSourcePropType
  onError?: (error: { nativeEvent: ImageErrorEventData }) => void
  /**
   * When true, the high-res image appears immediately without a fade animation.
   */
  immediate?: boolean
  /**
   * Optional render-time timeout (ms) for remote URI sources. If neither
   * `onLoad` nor `onError` fires within this window, a synthetic `onError`
   * is dispatched so callers (e.g. mirror-retry logic) can advance to the
   * next URL without waiting on a hung TCP connection.
   *
   * Defaults to 0 (disabled). Only applies to remote `{ uri }` sources —
   * local `require()`'d sources are unaffected.
   */
  timeoutMs?: number
}

// Export ImageProps without source for render prop usage
export type ImagePropsWithoutSource = Omit<ImageProps, 'source'>

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden'
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  }
})

/**
 * Harmony Image — a React Native image primitive with progressive loading.
 *
 * Behavior:
 *  - When `priorityLowResSource` is provided, renders the low-res image first
 *    and crossfades to the high-res image once it loads.
 *  - When `source` changes, fades the new image in for a smooth transition.
 *  - Falls back to a plain `<Image>` when no progressive props are set.
 */
export const Image = (props: ImageProps) => {
  const {
    source,
    priorityLowResSource,
    onError,
    onLoad,
    style,
    immediate = false,
    timeoutMs = 0,
    ...other
  } = props

  // Track whether the current source has resolved (loaded or errored) so the
  // timeout fallback doesn't fire after the fact, and so we can clear pending
  // timers on resolution.
  const hasResolvedRef = useRef(false)
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep the latest `onError` in a ref so the timeout closure always invokes
  // the freshest callback without needing to be in the effect deps (which
  // would reset the timer on every render).
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  })

  // Wrap onError to prevent Error objects from being passed as props
  // This fixes "Error.stack getter called with an invalid receiver" in Hermes
  const handleError = onError
    ? (
        error:
          | NativeSyntheticEvent<ImageErrorEventData>
          | { nativeEvent: ImageErrorEventData }
          | Error
      ) => {
        hasResolvedRef.current = true
        if (timeoutTimerRef.current) {
          clearTimeout(timeoutTimerRef.current)
          timeoutTimerRef.current = null
        }
        if (error instanceof Error) {
          onError({
            nativeEvent: { error: error.message || 'Image load error' }
          })
        } else {
          onError(error as { nativeEvent: ImageErrorEventData })
        }
      }
    : undefined

  // Local require()'d sources are available synchronously and don't need a
  // fade. Treat them like immediate to avoid an opacity-0 flash.
  const isLocalSource = typeof source === 'number'
  const startVisible = immediate || isLocalSource

  // Track which source is currently loaded so we can fade in.
  const opacity = useSharedValue(startVisible ? 1 : 0)
  const lastSourceRef = useRef<ImageSourcePropType | undefined>(source)
  const [showLowRes, setShowLowRes] = useState(!!priorityLowResSource)

  useEffect(() => {
    if (lastSourceRef.current !== source) {
      lastSourceRef.current = source
      opacity.value = startVisible ? 1 : 0
      if (priorityLowResSource) setShowLowRes(true)
    }
  }, [source, priorityLowResSource, startVisible, opacity])

  // Render-time timeout: if the remote image hasn't fired onLoad or onError
  // within `timeoutMs`, synthesize an onError so mirror-retry logic upstream
  // can advance to the next URL. The native image cache and TCP stack will
  // otherwise wait 60–90s on a hung connection without firing onError.
  useEffect(() => {
    hasResolvedRef.current = false
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current)
      timeoutTimerRef.current = null
    }

    if (!timeoutMs || timeoutMs <= 0) return
    if (!source || typeof source === 'number') return
    const uri = Array.isArray(source) ? source[0]?.uri : source.uri
    if (!uri) return

    timeoutTimerRef.current = setTimeout(() => {
      if (hasResolvedRef.current) return
      hasResolvedRef.current = true
      onErrorRef.current?.({
        nativeEvent: {
          error: `Image load timeout after ${timeoutMs}ms: ${uri}`
        }
      })
    }, timeoutMs)

    return () => {
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current)
        timeoutTimerRef.current = null
      }
    }
  }, [source, timeoutMs])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }))

  if (!source) {
    return null
  }

  const handleLoad = (e: NativeSyntheticEvent<ImageLoadEventData>) => {
    hasResolvedRef.current = true
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current)
      timeoutTimerRef.current = null
    }
    opacity.value = withTiming(1, { duration: immediate ? 100 : 300 })
    // Hide the low-res placeholder shortly after the high-res starts fading in.
    if (priorityLowResSource) {
      setTimeout(() => setShowLowRes(false), immediate ? 100 : 300)
    }
    onLoad?.(e)
  }

  // Without a low-res placeholder, render a single Image with a fade-in.
  // This still gives a smoother appearance than a hard pop.
  if (!priorityLowResSource) {
    return (
      <AnimatedRNImage
        source={source}
        style={[style, animatedStyle]}
        onLoad={handleLoad}
        onError={handleError}
        {...other}
      />
    )
  }

  // With a low-res placeholder, stack the two layers and crossfade.
  return (
    <View style={[styles.container, style]}>
      {showLowRes ? (
        <RNImage
          source={priorityLowResSource}
          style={styles.layer}
          blurRadius={8}
          {...other}
        />
      ) : null}
      <AnimatedRNImage
        source={source}
        style={[styles.layer, animatedStyle]}
        onLoad={handleLoad}
        onError={handleError}
        {...other}
      />
    </View>
  )
}

export const preload = (
  sources: Array<{ uri: string }>,
  timeoutMs: number = 5000
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const uris = sources.map((s) => s.uri).join(', ')

    const timer = setTimeout(() => {
      reject(new Error(`Failed to load (timeout) ${uris}`))
    }, timeoutMs)

    Promise.all(
      sources.map(async ({ uri }) => {
        const success = await RNImage.prefetch(uri)
        if (!success) {
          throw new Error(`Failed to prefetch image: ${uri}`)
        }
      })
    )
      .then(() => {
        clearTimeout(timer)
        resolve()
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(
          error instanceof Error
            ? error
            : new Error(`Failed to prefetch images: ${uris}`)
        )
      })
  })
}
