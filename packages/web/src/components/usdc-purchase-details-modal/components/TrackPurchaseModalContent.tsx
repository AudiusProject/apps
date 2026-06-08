import { useTrack } from '@audius/common/api'
import { SquareSizes, USDCPurchaseDetails } from '@audius/common/models'
import { pick } from 'lodash'

import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

import { PurchaseModalContent } from './PurchaseModalContent'

const messages = {
  track: 'Track'
}

export const TrackPurchaseModalContent = ({
  purchaseDetails,
  onClose
}: {
  purchaseDetails: USDCPurchaseDetails
  onClose: () => void
}) => {
  const { contentId } = purchaseDetails
  const { data: partialTrack } = useTrack(contentId, {
    select: (track) => pick(track, ['title', 'permalink'])
  })
  const { imageUrl: trackArtwork } = useTrackCoverArt({
    trackId: contentId,
    size: SquareSizes.SIZE_150_BY_150
  })

  if (!partialTrack) return null
  return (
    <PurchaseModalContent
      purchaseDetails={purchaseDetails}
      contentLabel={messages.track}
      contentTitle={partialTrack.title}
      link={partialTrack.permalink}
      artwork={trackArtwork}
      onClose={onClose}
    />
  )
}
