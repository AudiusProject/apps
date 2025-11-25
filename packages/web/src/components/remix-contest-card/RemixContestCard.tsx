import { MouseEvent, Ref, forwardRef, useCallback } from 'react'

import { useRemixContest, useTrack, useUser } from '@audius/common/api'
import { ID, SquareSizes } from '@audius/common/models'
import { formatContestDeadlineWithStatus } from '@audius/common/utils'
import { Flex, Skeleton, Text } from '@audius/harmony'
import { useLinkClickHandler } from 'react-router-dom'

import { Card, CardProps, CardFooter, CardContent } from 'components/card'
import { TextLink, UserLink } from 'components/link'
import { TrackArtwork } from 'components/track/TrackArtwork'

const messages = {
  deadline: (releaseDate?: string) =>
    releaseDate
      ? new Date(releaseDate) > new Date()
        ? formatContestDeadlineWithStatus(releaseDate, false)
        : 'Ended'
      : releaseDate
}

type RemixContestCardProps = Omit<CardProps, 'id'> & {
  id: ID
  loading?: boolean
  noNavigation?: boolean
}

export const RemixContestCardSkeleton = (
  props: Omit<CardProps, 'id'> & { noShimmer?: boolean }
) => (
  <Card {...props}>
    <Flex direction='column' p='s' gap='s'>
      <Skeleton
        border='default'
        css={{ aspectRatio: 1 }}
        noShimmer={props.noShimmer}
      />
      <CardContent gap='xs'>
        <Skeleton
          h={24}
          w='80%'
          alignSelf='center'
          noShimmer={props.noShimmer}
        />
        <Skeleton
          h={20}
          w='50%'
          alignSelf='center'
          noShimmer={props.noShimmer}
        />
      </CardContent>
    </Flex>
    <CardFooter>
      <Skeleton h={16} w='60%' alignSelf='center' noShimmer={props.noShimmer} />
    </CardFooter>
  </Card>
)

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
      return <RemixContestCardSkeleton size={size} {...other} />
    }

    return (
      <Card ref={ref} onClick={handleClick} size={size} {...other}>
        <Flex direction='column' p='s' gap='s'>
          <TrackArtwork
            trackId={track.track_id}
            size={SquareSizes.SIZE_480_BY_480}
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
            <UserLink
              userId={user?.user_id}
              popover
              center
              fullWidth
              ellipses
            />
          </CardContent>
        </Flex>
        <CardFooter>
          <Text strength='strong' size='s' color='subdued'>
            {messages.deadline(remixContest?.endDate)}
          </Text>
        </CardFooter>
      </Card>
    )
  }
)
