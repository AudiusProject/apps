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
  priorityLowResSource?: ImageSourcePropType
  onError?: (error: { nativeEvent: ImageErrorEventData }) => void
  immediate?: boolean
  timeoutMs?: number
}

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

  const hasResolvedRef = useRef(false)
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  })

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

  const isLocalSource = typeof source === 'number'
  const startVisible = immediate || isLocalSource

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
    if (priorityLowResSource) {
      setTimeout(() => setShowLowRes(false), immediate ? 100 : 300)
    }
    onLoad?.(e)
  }

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
