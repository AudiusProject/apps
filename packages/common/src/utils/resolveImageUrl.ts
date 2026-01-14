import { SquareSizes, WidthSizes } from '~/models/ImageSizes'
import { Maybe } from '~/utils/typeUtils'

type Artwork<T extends string | number | symbol> = { [key in T]?: string } & {
  mirrors?: string[] | undefined
}

const tryUrl = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response.ok
  } catch {
    return false
  }
}

const tryUrls = async (urls: string[]): Promise<string> => {
  for (const url of urls) {
    if (await tryUrl(url)) {
      return url
    }
  }
  return urls[0] ?? ''
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

  const urlsToTry: string[] = [targetUrl]
  if (artwork.mirrors) {
    for (const mirror of artwork.mirrors) {
      try {
        const mirrorUrl = new URL(targetUrl)
        mirrorUrl.hostname = new URL(mirror).hostname
        urlsToTry.push(mirrorUrl.toString())
      } catch {
        // no-op
      }
    }
  }

  const workingUrl = await tryUrls(urlsToTry)
  return workingUrl || defaultImage
}
