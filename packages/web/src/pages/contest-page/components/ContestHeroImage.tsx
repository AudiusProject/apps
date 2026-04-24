import { useEffect, useState } from 'react'

import { ID, SquareSizes } from '@audius/common/models'
import { Box, Skeleton, useTheme } from '@audius/harmony'

import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

type ContestHeroImageProps = {
  trackId?: ID
  height: string | number
}

/**
 * Contest detail page hero banner. Fetches the small (150×150) cover art
 * immediately to paint *something* while the full 1000×1000 is still in
 * flight, layers them so the large image fades over the small one, and
 * sits on a skeleton until at least the small image is ready — avoids
 * the long "totally blank" window users saw before.
 */
export const ContestHeroImage = ({ trackId, height }: ContestHeroImageProps) => {
  const { motion } = useTheme()

  const { imageUrl: smallUrl, hasNoArtwork } = useTrackCoverArt({
    trackId,
    size: SquareSizes.SIZE_150_BY_150
  })
  const { imageUrl: largeUrl } = useTrackCoverArt({
    trackId,
    size: SquareSizes.SIZE_1000_BY_1000
  })

  const [isSmallLoaded, setIsSmallLoaded] = useState(false)
  const [isLargeLoaded, setIsLargeLoaded] = useState(false)

  useEffect(() => {
    setIsSmallLoaded(false)
  }, [smallUrl])
  useEffect(() => {
    setIsLargeLoaded(false)
  }, [largeUrl])

  // Hide the skeleton once either size has painted OR we know the track has
  // no artwork at all (otherwise the skeleton would shimmer forever on
  // artwork-less tracks).
  const showSkeleton = !isSmallLoaded && !isLargeLoaded && !hasNoArtwork

  return (
    <Box
      w='100%'
      css={(theme) => ({
        height,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: theme.color.background.surface2
      })}
    >
      {showSkeleton ? (
        <Skeleton
          css={{ position: 'absolute', inset: 0, zIndex: 0 }}
        />
      ) : null}
      {smallUrl ? (
        <img
          src={smallUrl}
          alt=''
          draggable={false}
          onLoad={() => setIsSmallLoaded(true)}
          onError={() => setIsSmallLoaded(true)}
          css={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            // Slight blur while the small thumbnail is the only thing we have
            // — reads as a deliberate low-fi placeholder rather than a
            // pixelated thumbnail.
            filter: isLargeLoaded ? 'none' : 'blur(16px)',
            transform: 'scale(1.05)',
            opacity: isSmallLoaded ? 1 : 0,
            transition: `opacity ${motion.calm}`,
            zIndex: 1
          }}
        />
      ) : null}
      {largeUrl ? (
        <img
          src={largeUrl}
          alt=''
          draggable={false}
          onLoad={() => setIsLargeLoaded(true)}
          onError={() => setIsLargeLoaded(true)}
          css={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: isLargeLoaded ? 1 : 0,
            transition: `opacity ${motion.calm}`,
            zIndex: 2
          }}
        />
      ) : null}
    </Box>
  )
}
