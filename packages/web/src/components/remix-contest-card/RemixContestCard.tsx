import { MouseEvent, Ref, forwardRef, useCallback } from 'react'

import { useRemixContest, useTrack, useUser } from '@audius/common/api'
import { ID, SquareSizes } from '@audius/common/models'
import { formatDate } from '@audius/common/utils'
import { Flex, Skeleton, Text } from '@audius/harmony'
import { useLinkClickHandler } from 'react-router-dom-v5-compat'

import { Card, CardProps, CardFooter, CardContent } from 'components/card'
import { TextLink, UserLink } from 'components/link'
import { TrackArtwork } from 'components/track/TrackArtwork'

const messages = {
  deadline: (releaseDate?: string) =>
    releaseDate
      ? new Date(releaseDate) < new Date()
        ? `Deadline: ${formatDate(releaseDate)}`
        : 'Ended'
      : releaseDate
}

type RemixContestCardProps = Omit<CardProps, 'id'> & {
  id: ID
  loading?: boolean
  noNavigation?: boolean
}

export const RemixContestCard = forwardRef(
  (props: RemixContestCardProps, ref: Ref<HTMLDivElement>) => {
    const { id, loading, size, onClick, noNavigation, ...other } = props

    const { data: remixContest, isPending: isRemixContestPending } =
      useRemixContest(id)
    const { data: track, isPending: isTrackPending } = useTrack(
      remixContest?.entityId
    )
    const { data: user, isPending: isUserPending } = useUser(track?.owner_id)

    const isPending =
      isRemixContestPending || isTrackPending || isUserPending || !track

    const permalink = track?.permalink

    const handleNavigate = useLinkClickHandler<HTMLDivElement>(permalink ?? '')

    const handleClick = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        onClick?.(e)
        if (noNavigation) return
        handleNavigate(e)
      },
      [noNavigation, handleNavigate, onClick]
    )

    if (isPending || loading) {
      return (
        <Card size={size} {...other}>
          <Flex direction='column' p='s' gap='s'>
            <Skeleton border='default' css={{ aspectRatio: 1 }} />
            <CardContent gap='xs'>
              <Skeleton h={24} w='80%' alignSelf='center' />
              <Skeleton h={20} w='50%' alignSelf='center' />
            </CardContent>
          </Flex>
          <CardFooter>
            <Skeleton h={16} w='60%' alignSelf='center' />
          </CardFooter>
        </Card>
      )
    }

    return (
      <Card ref={ref} onClick={handleClick} size={size} {...other}>
        <Flex direction='column' p='s' gap='s'>
          <TrackArtwork
            trackId={track.track_id}
            size={SquareSizes.SIZE_150_BY_150}
            mr='xs'
            css={{ minHeight: 24, minWidth: 24 }}
          />
          <CardContent gap='xs'>
            <TextLink
              to={permalink}
              textVariant='title'
              css={{ justifyContent: 'center' }}
            >
              <Text ellipses>{track?.title}</Text>
            </TextLink>
            <Flex justifyContent='center'>
              <UserLink userId={user?.user_id} popover center />
            </Flex>
          </CardContent>
        </Flex>
        <CardFooter>
          <Text>{messages.deadline(remixContest?.endDate)} </Text>
        </CardFooter>
      </Card>
    )
  }
)
