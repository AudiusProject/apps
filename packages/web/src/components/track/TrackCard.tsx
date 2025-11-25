import { MouseEvent, Ref, forwardRef, useCallback } from 'react'

import { useTrack, useCurrentUserId } from '@audius/common/api'
import {
  ID,
  SquareSizes,
  isContentUSDCPurchaseGated
} from '@audius/common/models'
import { formatCount } from '@audius/common/utils'
import { Flex, Skeleton, Text } from '@audius/harmony'
import IconHeart from '@audius/harmony/src/assets/icons/Heart.svg'
import IconRepost from '@audius/harmony/src/assets/icons/Repost.svg'
import { pick } from 'lodash'
import { useLinkClickHandler } from 'react-router-dom'

import { Card, CardProps, CardFooter, CardContent } from 'components/card'
import { TextLink, UserLink } from 'components/link'
import { LockedStatusBadge } from 'components/locked-status-badge'

import { TrackArtwork } from './TrackArtwork'
import { TrackDogEar } from './TrackDogEar'

const messages = {
  repost: 'Reposts',
  favorites: 'Favorites'
}

type TrackCardProps = Omit<CardProps, 'id'> & {
  id: ID
  loading?: boolean
  noNavigation?: boolean
  onTrackLinkClick?: (e: MouseEvent<HTMLAnchorElement>) => void
}

const cardSizeToCoverArtSizeMap = {
  xs: SquareSizes.SIZE_150_BY_150,
  s: SquareSizes.SIZE_480_BY_480,
  m: SquareSizes.SIZE_480_BY_480,
  l: SquareSizes.SIZE_480_BY_480
}

export const TrackCardSkeleton = (
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

export const TrackCard = forwardRef(
  (props: TrackCardProps, ref: Ref<HTMLDivElement>) => {
    const {
      id,
      loading,
      size,
      onClick,
      onTrackLinkClick,
      noNavigation,
      ...other
    } = props

    const { data: currentUserId } = useCurrentUserId()
    const { data: track, isPending } = useTrack(id, {
      select: (track) =>
        pick(
          track,
          'title',
          'permalink',
          'owner_id',
          'repost_count',
          'save_count',
          'access',
          'stream_conditions'
        )
    })

    const {
      title,
      permalink,
      owner_id,
      repost_count,
      save_count,
      access,
      stream_conditions
    } = track ?? {}

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
      return <TrackCardSkeleton size={size} {...other} />
    }

    const isOwner = currentUserId === owner_id
    const isPurchase = isContentUSDCPurchaseGated(stream_conditions)

    return (
      <Card ref={ref} onClick={handleClick} size={size} {...other}>
        <TrackDogEar trackId={id} />
        <Flex direction='column' p='s' gap='s'>
          <TrackArtwork
            trackId={id}
            size={cardSizeToCoverArtSizeMap[size]}
            data-testid={`track-artwork-${id}`}
          />
          <CardContent gap='xs'>
            <TextLink
              to={permalink}
              textVariant='title'
              css={{ justifyContent: 'center' }}
              onClick={onTrackLinkClick}
            >
              <Text ellipses>{title}</Text>
            </TextLink>
            <UserLink userId={owner_id!} popover center fullWidth ellipses />
          </CardContent>
        </Flex>
        <CardFooter>
          <Flex gap='xs' alignItems='center'>
            <IconRepost size='s' color='subdued' title={messages.repost} />
            <Text variant='label' color='subdued'>
              {formatCount(repost_count || 0)}
            </Text>
          </Flex>
          <Flex gap='xs' alignItems='center'>
            <IconHeart size='s' color='subdued' title={messages.favorites} />
            <Text variant='label' color='subdued'>
              {formatCount(save_count || 0)}
            </Text>
          </Flex>
          {isPurchase && !isOwner ? (
            <LockedStatusBadge variant='premium' locked={!access?.stream} />
          ) : null}
        </CardFooter>
      </Card>
    )
  }
)
