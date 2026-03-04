import { useCallback } from 'react'

import { useTrack, useUser } from '@audius/common/api'
import { SquareSizes, ID } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'

import RemixCard from 'components/remix-card/RemixCard'
import { useProfilePicture } from 'hooks/useProfilePicture'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { push as pushRoute } from 'utils/navigation'
const { profilePage } = route

type OwnProps = {
  trackId: ID
}

type ConnectedRemixCardProps = OwnProps & ReturnType<typeof mapDispatchToProps>

const ConnectedRemixCard = ({
  trackId,
  goToRoute
}: ConnectedRemixCardProps) => {
  const { data: partialTrack } = useTrack(trackId, {
    select: (track) => {
      return {
        permalink: track?.permalink,
        owner_id: track?.owner_id,
        _co_sign: track?._co_sign
      }
    }
  })
  const { data: partialUser } = useUser(partialTrack?.owner_id, {
    select: (user) => {
      return {
        handle: user?.handle,
        name: user?.name,
        user_id: user?.user_id
      }
    }
  })
  const profilePictureImage = useProfilePicture({
    userId: partialUser?.user_id,
    size: SquareSizes.SIZE_150_BY_150
  })
  const { imageUrl: coverArtImage } = useTrackCoverArt({
    trackId,
    size: SquareSizes.SIZE_480_BY_480
  })
  const goToTrackPage = useCallback(() => {
    goToRoute(partialTrack?.permalink ?? '')
  }, [goToRoute, partialTrack])
  const goToArtistPage = useCallback(() => {
    goToRoute(profilePage(partialUser?.handle ?? ''))
  }, [goToRoute, partialUser])

  if (!partialTrack || !partialUser) return null

  return (
    <RemixCard
      profilePictureImage={profilePictureImage}
      coverArtImage={coverArtImage}
      coSign={partialTrack?._co_sign}
      artistName={partialUser?.name}
      artistHandle={partialUser?.handle}
      onClick={goToTrackPage}
      onClickArtistName={goToArtistPage}
      userId={partialUser?.user_id}
      trackId={trackId}
    />
  )
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    goToRoute: (route: string) => dispatch(pushRoute(route))
  }
}

export default connect(() => {}, mapDispatchToProps)(ConnectedRemixCard)
