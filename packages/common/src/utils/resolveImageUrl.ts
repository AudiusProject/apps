import { SquareSizes, WidthSizes } from '~/models/ImageSizes'
import { Maybe } from '~/utils/typeUtils'

type Artwork<T extends string | number | symbol> = { [key in T]?: string } & {
  mirrors?: string[] | undefined
}

/**
 * Preloads an image by creating an Image element and waiting for it to load.
 * Works in browser environments. In Node.js, this will throw an error.
 */
const preloadImage = (url: string, timeoutMs: number = 5000): Promise<void> => {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    // In Node.js, we can't preload images, so we'll just return a resolved promise
    // The caller should handle this case appropriately
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.src = url

    const timer = setTimeout(() => {
      img.src = '' // stop loading if still in progress
      reject(new Error(`Failed to load (timeout) ${url}`))
    }, timeoutMs)

    img.onload = () => {
      clearTimeout(timer)
      resolve()
    }

    img.onerror = () => {
      clearTimeout(timer)
      reject(new Error(`Failed to load ${url}`))
    }
  })
}

/**
 * Fetches an image URL with fallback to mirrors if the first fetch fails.
 * @param url - The original image URL
 * @param mirrors - Array of mirror hostnames to try as fallbacks
 * @returns A promise that resolves to a working URL
 */
const fetchWithFallback = async (
  url: string,
  mirrors: string[] = []
): Promise<string> => {
  const mirrorList = [...mirrors]
  let currentUrl = url

  // Try the original URL first
  try {
    await preloadImage(currentUrl)
    return currentUrl
  } catch {
    // If original fails and we have mirrors, try them
  }

  // Try each mirror
  while (mirrorList.length > 0) {
    const nextMirror = mirrorList.shift()
    if (!nextMirror) break

    try {
      const nextUrl = new URL(currentUrl)
      nextUrl.hostname = new URL(nextMirror).hostname
      currentUrl = nextUrl.toString()

      await preloadImage(currentUrl)
      return currentUrl
    } catch {
      // Continue to next mirror
    }
  }

  // If all mirrors fail, return the original URL anyway
  // The caller can handle the error state if needed
  return url
}

/**
 * Resolves an image URL from an artwork object, handling mirrors and fallbacks.
 * This is a non-React version of the logic in useImageSize hook.
 *
 * @param artwork - The artwork object containing size URLs and optional mirrors
 * @param targetSize - The desired size of the image
 * @param defaultImage - Optional fallback image URL if no image is found
 * @returns A promise that resolves to a working image URL, or the default image
 */
export const resolveImageUrl = async <
  SizeType extends SquareSizes | WidthSizes,
  ArtworkType extends Artwork<SizeType>
>({
  artwork,
  targetSize,
  defaultImage
}: {
  artwork?: ArtworkType
  targetSize: SizeType
  defaultImage?: string
}): Promise<Maybe<string>> => {
  if (!artwork) {
    return defaultImage
  }

  const targetUrl = artwork[targetSize]
  if (!targetUrl) {
    return defaultImage
  }

  try {
    const workingUrl = await fetchWithFallback(
      targetUrl,
      artwork.mirrors ?? []
    )
    return workingUrl
  } catch (error) {
    console.error(`Unable to resolve image URL ${targetUrl}:`, error)
    // Return the original URL or default as fallback
    return targetUrl || defaultImage
  }
}

