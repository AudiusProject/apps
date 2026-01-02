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

  return <RNImage source={source} onError={onError} {...other} />
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
