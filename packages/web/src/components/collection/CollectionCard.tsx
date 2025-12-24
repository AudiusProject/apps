import { MouseEvent, Ref, forwardRef, useCallback } from 'react'

import { useCollection, useCurrentUserId } from '@audius/common/api'
import {
  ID,
  SquareSizes,
  isContentUSDCPurchaseGated
} from '@audius/common/models'
import { formatCount, formatReleaseDate } from '@audius/common/utils'
import { Flex, Skeleton, Text } from '@audius/harmony'
import IconHeart from '@audius/harmony/src/assets/icons/Heart.svg'
import IconRepost from '@audius/harmony/src/assets/icons/Repost.svg'
import { pick } from 'lodash'
import { useLinkClickHandler } from 'react-router'

import { Card, CardProps, CardFooter, CardContent } from 'components/card'
import { TextLink, UserLink } from 'components/link'
import { LockedStatusBadge } from 'components/locked-status-badge'

import { CollectionDogEar } from './CollectionDogEar'
import { CollectionImage } from './CollectionImage'

const messages = {
  repost: 'Reposts',
  favorites: 'Favorites',
  hidden: 'Hidden',
  releases: (releaseDate: string) =>
    `Releases ${formatReleaseDate({ date: releaseDate })}`
}

type CollectionCardProps = Omit<CardProps, 'id'> & {
  id: ID
  loading?: boolean
  noNavigation?: boolean
  onCollectionLinkClick?: (e: MouseEvent<HTMLAnchorElement>) => void
}

const cardSizeToCoverArtSizeMap = {
  xs: SquareSizes.SIZE_150_BY_150,
  s: SquareSizes.SIZE_480_BY_480,
  m: SquareSizes.SIZE_480_BY_480,
  l: SquareSizes.SIZE_480_BY_480
}

export const CollectionCardSkeleton = (
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

export const CollectionCard = forwardRef(
  (props: CollectionCardProps, ref: Ref<HTMLDivElement>) => {
    const {
      id,
      loading,
      size,
      onClick,
      onCollectionLinkClick,
      noNavigation,
      ...other
    } = props

    const { data: currentUserId } = useCurrentUserId()
    const { data: collection, isPending } = useCollection(id, {
      select: (collection) =>
        pick(
          collection,
          'playlist_name',
          'permalink',
          'playlist_owner_id',
          'repost_count',
          'save_count',
          'is_private',
          'access',
          'stream_conditions',
          'is_scheduled_release',
          'release_date'
        )
    })

    const {
      playlist_name,
      permalink,
      playlist_owner_id,
      repost_count,
      save_count,
      is_private: isPrivate,
      access,
      stream_conditions,
      is_scheduled_release: isScheduledRelease,
      release_date: releaseDate
    } = collection ?? {}

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
      return <CollectionCardSkeleton size={size} {...other} />
    }

    const isOwner = currentUserId === playlist_owner_id
    const isPurchase = isContentUSDCPurchaseGated(stream_conditions)

    return (
      <Card ref={ref} onClick={handleClick} size={size} {...other}>
        <CollectionDogEar collectionId={id} />
        <Flex direction='column' p='s' gap='s'>
          <CollectionImage
            collectionId={id}
            size={cardSizeToCoverArtSizeMap[size]}
            data-testid={`cover-art-${id}`}
          />
          <CardContent gap='xs'>
            <TextLink
              to={permalink}
              textVariant='title'
              css={{ justifyContent: 'center' }}
              onClick={onCollectionLinkClick}
            >
              <Text ellipses>{playlist_name}</Text>
            </TextLink>
            <UserLink
              userId={playlist_owner_id!}
              popover
              center
              fullWidth
              ellipses
            />
          </CardContent>
        </Flex>
        <CardFooter>
          {isPrivate ? (
            <Text
              variant='body'
              size='s'
              strength='strong'
              color='subdued'
              css={(theme) => ({ lineHeight: theme.typography.lineHeight.s })}
            >
              {isScheduledRelease && releaseDate
                ? messages.releases(releaseDate)
                : messages.hidden}
            </Text>
          ) : (
            <>
              <Flex gap='xs' alignItems='center'>
                <IconRepost size='s' color='subdued' title={messages.repost} />
                <Text variant='label' color='subdued'>
                  {formatCount(repost_count!)}
                </Text>
              </Flex>
              <Flex gap='xs' alignItems='center'>
                <IconHeart
                  size='s'
                  color='subdued'
                  title={messages.favorites}
                />
                <Text variant='label' color='subdued'>
                  {formatCount(save_count!)}
                </Text>
              </Flex>
            </>
          )}
          {isPurchase && !isOwner ? (
            <LockedStatusBadge variant='premium' locked={!access?.stream} />
          ) : null}
        </CardFooter>
      </Card>
    )
  }
)
