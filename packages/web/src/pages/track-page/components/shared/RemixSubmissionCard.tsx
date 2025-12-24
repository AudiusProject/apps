import { useCallback } from 'react'

import { useUser, useTrack } from '@audius/common/api'
import { ID, SquareSizes } from '@audius/common/models'
import { Box, Flex, Skeleton } from '@audius/harmony'
import { useNavigate } from 'react-router'

import { Avatar } from 'components/avatar'
import { UserLink, TrackLink } from 'components/link'
import { TrackArtwork } from 'components/track/TrackArtwork'
import TrackFlair, { Size } from 'components/track-flair/TrackFlair'

export type RemixSubmissionCardSize = 'mobile' | 'desktop'

const SIZES = {
  mobile: {
    artwork: 140,
    avatar: 50,
    nameWidth: 120
  },
  desktop: {
    artwork: 160,
    avatar: 64,
    nameWidth: 140
  }
} as const

type RemixSubmissionCardProps = {
  trackId: ID
  size?: RemixSubmissionCardSize
}

export const RemixSubmissionCard = ({
  trackId,
  size = 'desktop'
}: RemixSubmissionCardProps) => {
  const navigate = useNavigate()
  const { data: track, isLoading: trackLoading } = useTrack(trackId)
  const { data: user, isLoading: userLoading } = useUser(track?.owner_id)
  const isLoading = trackLoading || userLoading
  const displaySkeleton = isLoading || !track || !user

  const {
    artwork: ARTWORK_SIZE,
    avatar: USER_AVATAR_SIZE,
    nameWidth: NAME_WIDTH
  } = SIZES[size]

  const goToTrack = useCallback(() => {
    if (!track?.permalink) return
    navigate(track.permalink)
  }, [navigate, track?.permalink])

  return (
    <Flex
      column
      gap='s'
      css={{ minWidth: ARTWORK_SIZE, maxWidth: ARTWORK_SIZE + 20 }}
    >
      <Flex borderRadius='s'>
        {displaySkeleton ? (
          <Skeleton h={ARTWORK_SIZE} w={ARTWORK_SIZE} borderRadius='s' />
        ) : (
          <>
            {/* Track Artwork with Flair */}
            <TrackFlair
              css={{ height: '100%', width: '100%' }}
              id={track.track_id}
              size={Size.LARGE}
              hideToolTip
            >
              <TrackArtwork
                css={{
                  width: '100%',
                  height: '100%',
                  cursor: 'pointer'
                }}
                trackId={track.track_id}
                onClick={goToTrack}
                size={SquareSizes.SIZE_480_BY_480}
              />
            </TrackFlair>
            {/* User Avatar */}
            <Box
              h={USER_AVATAR_SIZE}
              w={USER_AVATAR_SIZE}
              css={{ position: 'absolute', top: -8, right: -8, zIndex: 10 }}
              borderRadius='circle'
            >
              <Avatar
                userId={user.user_id}
                imageSize={SquareSizes.SIZE_150_BY_150}
              />
            </Box>
          </>
        )}
      </Flex>
      <Flex
        column
        gap='xs'
        w={ARTWORK_SIZE}
        alignItems={size === 'mobile' ? 'center' : undefined}
      >
        {displaySkeleton ? (
          <>
            <Skeleton
              h={size === 'mobile' ? 20 : 24}
              w={size === 'mobile' ? 100 : 120}
            />
            <Skeleton
              h={size === 'mobile' ? 18 : 24}
              w={size === 'mobile' ? 64 : 80}
            />
          </>
        ) : (
          <>
            <TrackLink
              textVariant='title'
              size={size === 'mobile' ? 's' : undefined}
              trackId={track.track_id}
              ellipses
              css={{ display: 'block', maxWidth: NAME_WIDTH }}
            />
            <UserLink
              userId={user.user_id}
              size={size === 'mobile' ? 's' : undefined}
              popover={size === 'desktop'}
              ellipses
              css={{
                display: 'block',
                maxWidth: NAME_WIDTH,
                justifyContent: size === 'mobile' ? 'center' : undefined
              }}
            />
          </>
        )}
      </Flex>
    </Flex>
  )
}
