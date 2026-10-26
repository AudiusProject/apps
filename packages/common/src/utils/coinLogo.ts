import { SquareSizes } from '~/models/ImageSizes'

// A bare validator node content URL, e.g. https://creatornode.audius.co/content/<cid>.
// Coin logos launched after the Irys -> Audius migration (and existing logos
// once they are re-hosted) are stored this way, and the node resizes any image
// it stores on demand at /content/<cid>/<size>.jpg.
const CONTENT_NODE_URL_REGEX = /^(https?:\/\/[^/?#]+\/content\/[^/?#]+)\/?$/

// Smallest variant that stays sharp at 3x pixel density
const getSquareSizeForDisplay = (displaySize: number) => {
  const pixels = displaySize * 3
  if (pixels <= 150) return SquareSizes.SIZE_150_BY_150
  if (pixels <= 480) return SquareSizes.SIZE_480_BY_480
  return SquareSizes.SIZE_1000_BY_1000
}

/**
 * Returns a resized variant of a coin's `logo_uri` for drawing it at
 * `displaySize` CSS pixels. Coin logos are uploaded at up to 1000px and often
 * weigh 0.5-2 MB, so badges should never load the original.
 *
 * Only validator node URLs can be resized. Other URLs (Irys/Arweave, static
 * assets) are returned unchanged.
 */
export const getCoinLogoUrl = <T extends string | null | undefined>(
  logoUri: T,
  displaySize: number
): T | string => {
  if (!logoUri) return logoUri
  const match = CONTENT_NODE_URL_REGEX.exec(logoUri)
  if (!match) return logoUri
  return `${match[1]}/${getSquareSizeForDisplay(displaySize)}.jpg`
}
