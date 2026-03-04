import { useCollection } from '@audius/common/api'
import { imageBlank as imageEmpty } from '@audius/common/assets'
import { useImageSize } from '@audius/common/hooks'
import { SquareSizes, ID } from '@audius/common/models'
import { Maybe } from '@audius/common/utils'

import { preload } from 'utils/image'

const hasValidArtwork = (artwork: unknown): boolean =>
  !!artwork &&
  typeof artwork === 'object' &&
  Object.entries(artwork).some(
    ([k, v]) => k !== 'mirrors' && typeof v === 'string' && v.length > 0
  )

export const useCollectionCoverArt = ({
  collectionId,
  size,
  defaultImage
}: {
  collectionId: Maybe<ID>
  size: SquareSizes
  defaultImage?: string
}) => {
  const { data: artworkData } = useCollection(collectionId, {
    select: (collection) =>
      collection != null
        ? {
            artwork: collection.artwork,
            hasNoArtwork: !hasValidArtwork(collection.artwork)
          }
        : undefined
  })
  const artwork = artworkData?.artwork
  const hasNoArtwork = artworkData?.hasNoArtwork ?? false
  const { imageUrl } = useImageSize({
    artwork,
    targetSize: size,
    defaultImage: defaultImage ?? imageEmpty,
    preloadImageFn: preload
  })

  // Return edited artwork from this session, if it exists
  if (artwork?.url) return { imageUrl: artwork.url, hasNoArtwork: false }

  return {
    imageUrl,
    hasNoArtwork: hasNoArtwork && !artwork?.url
  }
}
