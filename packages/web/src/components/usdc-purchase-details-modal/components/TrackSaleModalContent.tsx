import { useTrack } from '@audius/common/api'
import { SquareSizes, USDCPurchaseDetails } from '@audius/common/models'

import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

import { SaleModalContent } from './SaleModalContent'

const messages = {
  track: 'Track Purchased'
}

export const TrackSaleModalContent = ({
  purchaseDetails,
  onClose
}: {
  purchaseDetails: USDCPurchaseDetails
  onClose: () => void
}) => {
  const { contentId } = purchaseDetails
  const { data: partialTrack } = useTrack(contentId, {
    select: (track) => ({
      title: track.title,
      permalink: track.permalink
    })
  })
  const trackArtwork = useTrackCoverArt({
    trackId: contentId,
    size: SquareSizes.SIZE_150_BY_150
  })

  if (!partialTrack) return null

  return (
    <SaleModalContent
      purchaseDetails={purchaseDetails}
      contentLabel={messages.track}
      contentTitle={partialTrack.title}
      link={partialTrack.permalink}
      artwork={trackArtwork}
      onClose={onClose}
    />
  )
}
