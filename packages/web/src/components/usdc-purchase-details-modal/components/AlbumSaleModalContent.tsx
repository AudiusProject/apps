import { useCollection } from '@audius/common/api'
import { SquareSizes, USDCPurchaseDetails } from '@audius/common/models'
import { pick } from 'lodash'

import { useCollectionCoverArt } from 'hooks/useCollectionCoverArt'

import { SaleModalContent } from './SaleModalContent'

const messages = {
  album: 'Album Purchased'
}

export const AlbumSaleModalContent = ({
  purchaseDetails,
  onClose
}: {
  purchaseDetails: USDCPurchaseDetails
  onClose: () => void
}) => {
  const { contentId } = purchaseDetails
  const { data: partialAlbum } = useCollection(contentId, {
    enabled: !!contentId,
    select: (collection) => pick(collection, ['playlist_name', 'permalink'])
  })
  const { playlist_name, permalink } = partialAlbum ?? {}
  const albumArtwork = useCollectionCoverArt({
    collectionId: contentId,
    size: SquareSizes.SIZE_150_BY_150
  })

  if (!partialAlbum) return null

  return (
    <SaleModalContent
      purchaseDetails={purchaseDetails}
      contentLabel={messages.album}
      contentTitle={playlist_name}
      link={permalink ?? ''}
      artwork={albumArtwork}
      onClose={onClose}
    />
  )
}
