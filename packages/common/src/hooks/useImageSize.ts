import { useState, useEffect, useCallback } from 'react'

import { SquareSizes, WidthSizes } from '~/models'
import { Maybe } from '~/utils/typeUtils'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  module NodeJS {
    interface Global {
      IMAGE_CACHE: Set<string>
    }
  }
  // eslint-disable-next-line no-var
  var IMAGE_CACHE: Set<string>
}

if (typeof global !== 'undefined') {
  if (!global.IMAGE_CACHE) {
    global.IMAGE_CACHE = new Set<string>()
  }
}

const IMAGE_CACHE =
  typeof global !== 'undefined' ? global.IMAGE_CACHE : new Set<string>()

// Gets the width from a given image size, e.g. '150x150' => 150
const getWidth = (size: string) => {
  return parseInt(size.split('x')[0])
}

type Artwork<T extends string | number | symbol> = { [key in T]?: string }

/**
 * Fetches an image from the given artwork object managing sizes and using fallback mirrors if necessary.
 *  - If a larger image has already been fetched and is in the cache, use it instead
 *  - If a smaller image has already been fetched and is in the cache, use it while fetching the larger one
 *  - If fetching a given image fails, substitute out mirrors and try again
 * @param artwork - The artwork object to fetch from
 * @param targetSize - The desired size of the image
 * @param defaultImage - The fallback image to use if no image is found in the `artwork` object
 * @param preloadImageFn - A function to preload an image. If not provided, the image will not be preloaded
 *    and it is up to the caller to preload the image if desired.
 * @returns The url of the image, or undefined if the image is not available
 */
export const useImageSize = <
  SizeType extends SquareSizes | WidthSizes,
  ArtworkType extends Artwork<SizeType> & { mirrors?: string[] | undefined }
>({
  artwork,
  targetSize,
  defaultImage,
  preloadImageFn
}: {
  artwork?: ArtworkType
  targetSize: SizeType
  defaultImage?: string
  preloadImageFn?: (url: string) => Promise<void>
}) => {
  const [imageUrl, setImageUrl] = useState<Maybe<string>>(undefined)
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())

  const fetchWithFallback = useCallback(
    async (url: string) => {
      const mirrors = [...(artwork?.mirrors ?? [])]
      let currentUrl = url

      while (mirrors.length >= 0) {
        try {
          await preloadImageFn?.(currentUrl)
          return currentUrl
        } catch {
          const nextMirror = mirrors.shift()
          if (!nextMirror) throw new Error('No mirror found')
          const nextUrl = new URL(currentUrl)
          nextUrl.hostname = new URL(nextMirror).hostname
          currentUrl = nextUrl.toString()
        }
      }

      throw new Error(`Failed to fetch image from all mirrors ${url}`)
    },
    [artwork?.mirrors, preloadImageFn]
  )

  const getNextMirrorUrl = useCallback(
    (originalUrl: string, failedUrls: Set<string>) => {
      const mirrors = artwork?.mirrors ?? []
      if (mirrors.length === 0) return null

      for (const mirror of mirrors) {
        const nextUrl = new URL(originalUrl)
        nextUrl.hostname = new URL(mirror).hostname
        const mirrorUrl = nextUrl.toString()

        if (!failedUrls.has(mirrorUrl)) {
          return mirrorUrl
        }
      }
      return null
    },
    [artwork?.mirrors]
  )

  const resolveImageUrl = useCallback(async () => {
    if (!artwork) {
      return
    }
    const targetUrl = artwork[targetSize]
    if (!targetUrl) {
      setImageUrl(defaultImage)
      return
    }

    // If the original URL failed, try mirrors
    if (failedUrls.has(targetUrl)) {
      const mirrorUrl = getNextMirrorUrl(targetUrl, failedUrls)
      if (mirrorUrl) {
        setImageUrl(mirrorUrl)
        return
      }
    }

    if (IMAGE_CACHE.has(targetUrl)) {
      setImageUrl(targetUrl)
      return
    }

    // Check for smaller size in the cache
    // If found, set the image url and preload the actual target url
    const smallerSize = Object.keys(artwork).find(
      (size) =>
        getWidth(size) < getWidth(targetSize) &&
        size in artwork &&
        artwork[size as SizeType] &&
        IMAGE_CACHE.has(artwork[size as SizeType]!)
    ) as SizeType | undefined

    // Check for larger size
    // If found, set the image url to the larger size and return
    const largerSize = Object.keys(artwork).find(
      (size) =>
        getWidth(size) > getWidth(targetSize) &&
        artwork[size as SizeType] &&
        IMAGE_CACHE.has(artwork[size as SizeType]!)
    ) as SizeType | undefined

    if (largerSize) {
      setImageUrl(artwork[largerSize])
      return
    }

    if (smallerSize) {
      setImageUrl(artwork[smallerSize])
      const finalUrl = await fetchWithFallback(targetUrl)
      IMAGE_CACHE.add(finalUrl)
      setImageUrl(finalUrl)
      return
    }

    // Fetch image with fallback mirrors
    try {
      const finalUrl = await fetchWithFallback(targetUrl)
      IMAGE_CACHE.add(finalUrl)
      setImageUrl(finalUrl)
    } catch (e) {
      console.error(`Unable to load image ${targetUrl} after retries: ${e}`)
    }
  }, [
    artwork,
    targetSize,
    fetchWithFallback,
    defaultImage,
    failedUrls,
    getNextMirrorUrl
  ])

  const onError = useCallback(
    (url: string) => {
      setFailedUrls((prev) => new Set(prev).add(url))
    },
    [setFailedUrls]
  )

  useEffect(() => {
    resolveImageUrl()
  }, [resolveImageUrl])

  return { imageUrl, onError }
}
