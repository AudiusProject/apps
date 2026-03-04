import { ID, SquareSizes } from '@audius/common/models'
import { Artwork, ArtworkProps } from '@audius/harmony'

import { useCollectionCoverArt } from 'hooks/useCollectionCoverArt'

type CollectionImageProps = {
  collectionId: ID
  size: SquareSizes
} & ArtworkProps

export const CollectionImage = (props: CollectionImageProps) => {
  const { collectionId, size, ...other } = props

  const { imageUrl: imageSource } = useCollectionCoverArt({
    collectionId,
    size
  })

  return <Artwork src={imageSource} {...other} />
}
