import { ID, SquareSizes } from '@audius/common/models'
import { Artwork, ArtworkProps } from '@audius/harmony'

import TrackFlair, { Size } from 'components/track-flair/TrackFlair'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

type TrackArtworkProps = {
  trackId: ID
  size: SquareSizes
  flairSize?: Size
  hideToolTip?: boolean
  isLoading?: boolean
} & Omit<ArtworkProps, 'src'>

// TODO build this out and replace the existing TrackImage component
export const TrackArtwork = (props: TrackArtworkProps) => {
  const {
    trackId,
    size,
    flairSize = Size.LARGE,
    hideToolTip = false,
    isLoading = false,
    ...other
  } = props

  const { imageUrl: imageSource } = useTrackCoverArt({ trackId, size })

  const artworkElement = (
    <Artwork src={imageSource} isLoading={isLoading} {...other} />
  )

  return (
    <TrackFlair size={flairSize} id={trackId} hideToolTip={hideToolTip}>
      {artworkElement}
    </TrackFlair>
  )
}
