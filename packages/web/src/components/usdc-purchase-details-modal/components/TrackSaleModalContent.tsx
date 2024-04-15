import { useGetTrackById } from '@audius/common/api'
import { SquareSizes, USDCPurchaseDetails } from '@audius/common/models'

import { useTrackCoverArt2 } from 'hooks/useTrackCoverArt'

import { SaleModalContent } from './SaleModalContent'

const messages = {
  track: 'Track'
}

export const TrackSaleModalContent = ({
  purchaseDetails,
  onClose
}: {
  purchaseDetails: USDCPurchaseDetails
  onClose: () => void
}) => {
  const { contentId } = purchaseDetails
  const { data: track } = useGetTrackById({ id: contentId })
  const trackArtwork = useTrackCoverArt2(contentId, SquareSizes.SIZE_150_BY_150)

  if (!track) return null

  return (
    <SaleModalContent
      purchaseDetails={purchaseDetails}
      contentLabel={messages.track}
      contentTitle={track?.title}
      link={track.permalink}
      artwork={trackArtwork}
      onClose={onClose}
    />
  )
}
