import type { ComponentProps } from 'react'

import {
  Image as RNImage,
  type ImageErrorEventData,
  type ImageSourcePropType
} from 'react-native'

export type ImageProps = ComponentProps<typeof RNImage> & {
  source?: ImageSourcePropType
  onError?: (error: { nativeEvent: ImageErrorEventData }) => void
}

// Export ImageProps without source for render prop usage
export type ImagePropsWithoutSource = Omit<ImageProps, 'source'>

/**
 * Utility component that wraps React Native's Image component
 */
export const Image = (props: ImageProps) => {
  const { source, onError, ...other } = props

  if (!source) {
    return null
  }

  // Wrap onError to prevent Error objects from being passed as props
  // This fixes "Error.stack getter called with an invalid receiver" in Hermes
  const handleError = onError
    ? (error: { nativeEvent: ImageErrorEventData } | Error) => {
        // Ensure we always pass the expected event structure, not a raw Error object
        if (error instanceof Error) {
          // If we receive an Error object, wrap it in the expected structure
          onError({
            nativeEvent: {
              error: error.message || 'Image load error'
            }
          })
        } else {
          onError(error)
        }
      }
    : undefined

  return <RNImage source={source} onError={handleError} {...other} />
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
