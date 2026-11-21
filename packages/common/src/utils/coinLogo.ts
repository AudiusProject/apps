import { SquareSizes } from '~/models/ImageSizes'

const CONTENT_NODE_URL_REGEX = /^(https?:\/\/[^/?#]+\/content\/[^/?#]+)\/?$/

const getSquareSizeForDisplay = (displaySize: number) => {
  const pixels = displaySize * 3
  if (pixels <= 150) return SquareSizes.SIZE_150_BY_150
  if (pixels <= 480) return SquareSizes.SIZE_480_BY_480
  return SquareSizes.SIZE_1000_BY_1000
}

export const getCoinLogoUrl = <T extends string | null | undefined>(
  logoUri: T,
  displaySize: number
): T | string => {
  if (!logoUri) return logoUri
  const match = CONTENT_NODE_URL_REGEX.exec(logoUri)
  if (!match) return logoUri
  return `${match[1]}/${getSquareSizeForDisplay(displaySize)}.jpg`
}
