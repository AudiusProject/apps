const TWITTER_FOOTER_HEIGHT_THRESHOLD = 400

export const isMobileWebTwitter = (isTwitter) => {
  const isSquare =
    document.documentElement.clientHeight ===
    document.documentElement.clientWidth
  const isSmall =
    document.documentElement.clientHeight < TWITTER_FOOTER_HEIGHT_THRESHOLD
  return isTwitter && isSmall && isSquare
}
