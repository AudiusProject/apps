import { SquareSizes, WidthSizes } from '~/models/ImageSizes'
import { Maybe } from '~/utils/typeUtils'

import { resolveUrlWithCascadingTimeout } from './resolveUrlWithCascadingTimeout'

type Artwork<T extends string | number | symbol> = { [key in T]?: string } & {
  mirrors?: string[] | undefined
}

/**
 * Resolves an image URL from an artwork object using cascading timeouts:
 * try primary (2s) → mirrors (2s) → mirrors (5s) → mirrors (30s)
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

  const workingUrl = await resolveUrlWithCascadingTimeout(urlsToTry)
  return workingUrl || defaultImage
}
