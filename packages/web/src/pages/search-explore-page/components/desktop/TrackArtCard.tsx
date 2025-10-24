import { useCallback } from 'react'

import { useRemixContest, useTrack } from '@audius/common/api'
import { ID, SquareSizes } from '@audius/common/models'
import { dayjs, formatContestDeadlineWithStatus } from '@audius/common/utils'
import { Flex, Skeleton, Text } from '@audius/harmony'
import { useNavigate } from 'react-router-dom-v5-compat'

import { TrackLink } from 'components/link/TrackLink'
import { UserLink } from 'components/link/UserLink'
import PerspectiveCard from 'components/perspective-card/PerspectiveCard'
import { TrackArtwork } from 'components/track/TrackArtwork'

type TrackArtCardProps = {
  id: ID
}

const messages = {
  remixContest: 'Remix Contest',
  deadline: 'Deadline',
  ended: 'Ended',
  contestDeadline: (endDate: string | undefined) => {
    if (!endDate) return null

    const isContestEnded = dayjs(endDate).isBefore(dayjs())
    return formatContestDeadlineWithStatus(endDate, isContestEnded)
  }
}

const ARTWORK_SIZE = 240

export const TrackArtCard = ({ id }: TrackArtCardProps) => {
  const navigate = useNavigate()

  const { data: track, isLoading: isTrackLoading } = useTrack(id)
  const { data: contest, isLoading: isContestLoading } = useRemixContest(id)
  const isLoading = isTrackLoading || isContestLoading
  const isRemixContest = !!contest

  const goToTrack = useCallback(() => {
    if (!track?.permalink) return
    navigate(track.permalink)
  }, [navigate, track?.permalink])

  if (!track) return null

  return (
    <Flex column alignItems='center' gap='s'>
      <PerspectiveCard onClick={goToTrack}>
        <TrackArtwork
          trackId={id}
          size={SquareSizes.SIZE_480_BY_480}
          h={ARTWORK_SIZE}
          w={ARTWORK_SIZE}
        />
      </PerspectiveCard>
      <Flex
        column
        gap='xs'
        alignItems='center'
        ph='m'
        css={{ maxWidth: ARTWORK_SIZE }}
      >
        {isLoading ? (
          <>
            <Skeleton h={24} w={160} />
            <Skeleton h={24} w={100} />
          </>
        ) : (
          <>
            <TrackLink maxLines={2} trackId={id} textVariant='title' size='l' />
            <UserLink
              userId={track.owner_id}
              popover
              textVariant='title'
              strength='weak'
              center
            />
            {isRemixContest && (
              <Text variant='body' size='s' strength='strong' color='subdued'>
                {messages.contestDeadline(contest.endDate)}
              </Text>
            )}
          </>
        )}
      </Flex>
    </Flex>
  )
}
