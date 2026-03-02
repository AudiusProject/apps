import { useState, useCallback } from 'react'
import {
  getArtworkUrl,
  getNextMirrorUrl,
  type ArtworkLike
} from '../utils/artwork'

type TrackArtworkImageProps = {
  artwork: ArtworkLike | undefined
  size?: '150x150' | '480x480' | '1000x1000'
  alt: string
  className?: string
}

export function TrackArtworkImage({
  artwork,
  size = '150x150',
  alt,
  className
}: TrackArtworkImageProps) {
  const primaryUrl = getArtworkUrl(artwork, size)
  const mirrors = artwork?.mirrors ?? []

  const [src, setSrc] = useState<string | undefined>(primaryUrl)
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())

  const handleError = useCallback(() => {
    if (src == null) return
    setFailedUrls((prev) => {
      const next = new Set(prev).add(src)
      const mirrorUrl = getNextMirrorUrl(src, mirrors)
      if (mirrorUrl && !next.has(mirrorUrl)) {
        setSrc(mirrorUrl)
      }
      return next
    })
  }, [src, mirrors])

  if (primaryUrl == null) {
    return (
      <div
        className={className}
        style={{
          width: size === '150x150' ? 56 : size === '480x480' ? 120 : 160,
          height: size === '150x150' ? 56 : size === '480x480' ? 120 : 160,
          backgroundColor: '#eee',
          borderRadius: 4,
          flexShrink: 0
        }}
        aria-hidden
      />
    )
  }

  return (
    <img
      src={src ?? primaryUrl}
      alt={alt}
      className={className}
      loading="lazy"
      onError={handleError}
      style={{ borderRadius: 4, flexShrink: 0, objectFit: 'cover' }}
    />
  )
}
