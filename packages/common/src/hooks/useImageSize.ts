import { useState, useEffect, useCallback, useRef } from 'react'

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

const getWidth = (size: string) => {
  return parseInt(size.split('x')[0])
}

const MAX_LARGER_SIZE_RATIO = 3.5

type Artwork<T extends string | number | symbol> = { [key in T]?: string }

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
  const [priorityLowResUrl, setPriorityLowResUrl] =
    useState<Maybe<string>>(undefined)
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())

  const preloadImageFnRef = useRef(preloadImageFn)
  useEffect(() => {
    preloadImageFnRef.current = preloadImageFn
  }, [preloadImageFn])

  const fetchWithFallback = useCallback(
    async (url: string) => {
      const mirrors = [...(artwork?.mirrors ?? [])]
      let currentUrl = url

      while (mirrors.length >= 0) {
        try {
          await preloadImageFnRef.current?.(currentUrl)
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
    [artwork?.mirrors]
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

    const smallerSize = Object.keys(artwork).find(
      (size) =>
        getWidth(size) < getWidth(targetSize) &&
        size in artwork &&
        artwork[size as SizeType] &&
        IMAGE_CACHE.has(artwork[size as SizeType]!)
    ) as SizeType | undefined

    const largerSize = Object.keys(artwork)
      .filter(
        (size) =>
          getWidth(size) > getWidth(targetSize) &&
          getWidth(size) <= getWidth(targetSize) * MAX_LARGER_SIZE_RATIO &&
          artwork[size as SizeType] &&
          IMAGE_CACHE.has(artwork[size as SizeType]!)
      )
      .sort((a, b) => getWidth(a) - getWidth(b))[0] as SizeType | undefined

    if (largerSize) {
      setImageUrl(artwork[largerSize])
      return
    }

    if (smallerSize) {
      setPriorityLowResUrl(artwork[smallerSize])
      setImageUrl(targetUrl)
      try {
        const finalUrl = await fetchWithFallback(targetUrl)
        IMAGE_CACHE.add(finalUrl)
        if (finalUrl !== targetUrl) setImageUrl(finalUrl)
      } catch (e) {
        setImageUrl(artwork[smallerSize])
      }
      return
    }

    setImageUrl(targetUrl)
    try {
      const finalUrl = await fetchWithFallback(targetUrl)
      IMAGE_CACHE.add(finalUrl)
      if (finalUrl !== targetUrl) setImageUrl(finalUrl)
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

  return { imageUrl, priorityLowResUrl, onError }
}
