/**
 * Artwork from API can use snake_case keys ("150x150") or SDK model (_150x150).
 * Mirrors are used for fallback when the primary CDN fails.
 */
export type ArtworkLike = {
  _150x150?: string
  _480x480?: string
  _1000x1000?: string
  '150x150'?: string
  '480x480'?: string
  '1000x1000'?: string
  mirrors?: string[]
  /** Legacy single URL; used when no size-specific URLs exist */
  coverArt?: string
}

const SIZES = ['150x150', '480x480', '1000x1000'] as const

function getUrl(artwork: ArtworkLike | undefined, size: string): string | undefined {
  if (!artwork) return undefined
  const rec = artwork as Record<string, string | undefined>
  return rec[size] ?? rec[`_${size}`]
}

/** Preferred size for list rows */
export function getArtworkUrl(
  artwork: ArtworkLike | undefined,
  preferredSize: '150x150' | '480x480' | '1000x1000' = '150x150'
): string | undefined {
  const url = getUrl(artwork, preferredSize)
  if (url) return url
  for (const s of SIZES) {
    const u = getUrl(artwork, s)
    if (u) return u
  }
  return artwork?.coverArt
}

/**
 * Given a failed image URL and mirrors array, return the next URL to try
 * by replacing the host with the mirror's host.
 */
export function getNextMirrorUrl(
  currentUrl: string,
  mirrors: string[] | undefined
): string | null {
  if (!mirrors?.length) return null
  try {
    const url = new URL(currentUrl)
    for (const mirror of mirrors) {
      const mirrorHost = new URL(mirror).hostname
      if (url.hostname === mirrorHost) continue
      const next = new URL(currentUrl)
      next.hostname = mirrorHost
      return next.toString()
    }
  } catch {
    // invalid URL
  }
  return null
}
