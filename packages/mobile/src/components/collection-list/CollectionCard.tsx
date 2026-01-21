import { memo, useCallback } from 'react'

import { useCollection, useCurrentUserId } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { SquareSizes, isContentUSDCPurchaseGated } from '@audius/common/models'
import { formatCount, formatReleaseDate } from '@audius/common/utils'
import { pick } from 'lodash'
import type { GestureResponderEvent } from 'react-native'

import {
  Divider,
  Flex,
  IconHeart,
  IconRepost,
  Paper,
  Text
} from '@audius/harmony-native'
import { UserLink } from 'app/components/user-link'
import { useNavigation } from 'app/hooks/useNavigation'

import { CollectionDogEar } from '../collection/CollectionDogEar'
import { LockedStatusBadge } from '../core'
import { CollectionImage } from '../image/CollectionImage'
import { CollectionDownloadStatusIndicator } from '../offline-downloads'

import { CollectionCardSkeleton } from './CollectionCardSkeleton'

const messages = {
  repost: 'Reposts',
  favorites: 'Favorites',
  hidden: 'Hidden',
  releases: (releaseDate: string) =>
    `Releases ${formatReleaseDate({ date: releaseDate })}`
}

type CollectionCardProps = {
  id: ID
  onPress?: (e: GestureResponderEvent) => void
  noNavigation?: boolean
}

const CollectionCardComponent = (props: CollectionCardProps) => {
  const { id, onPress, noNavigation } = props

  const { data: partialCollection } = useCollection(id, {
    select: (collection) =>
      pick(
        collection,
        'playlist_name',
        'playlist_owner_id',
        'repost_count',
        'save_count',
        'is_private',
        'access',
        'stream_conditions',
        'release_date',
        'is_scheduled_release',
        'offline'
      )
  })
  const {
    playlist_name,
    playlist_owner_id,
    repost_count,
    save_count,
    is_private,
    access,
    stream_conditions,
    release_date,
    is_scheduled_release,
    offline
  } = partialCollection ?? {}
  const { data: accountId } = useCurrentUserId()

  const navigation = useNavigation()

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      onPress?.(e)
      if (noNavigation) return
      navigation.navigate('Collection', { id })
    },
    [onPress, noNavigation, navigation, id]
  )

  if (!partialCollection) {
    console.warn('Collection missing for CollectionCard, preventing render')
    return <CollectionCardSkeleton />
  }

  const isOwner = accountId === playlist_owner_id
  const isPurchase = isContentUSDCPurchaseGated(stream_conditions)

  return (
    <Paper border='default' onPress={handlePress}>
      <CollectionDogEar collectionId={id} />
      <Flex p='s' gap='s'>
        <CollectionImage
          collectionId={id}
          size={SquareSizes.SIZE_480_BY_480}
          style={{ flex: 1 }}
        />
        <Text variant='title' textAlign='center' numberOfLines={1}>
          {playlist_name}
        </Text>
        <UserLink
          userId={playlist_owner_id!}
          textAlign='center'
          style={{ justifyContent: 'center' }}
        />
      </Flex>
      <Divider orientation='horizontal' />
      <Flex
        direction='row'
        gap='l'
        pv='s'
        justifyContent='center'
        backgroundColor='surface1'
        borderBottomLeftRadius='m'
        borderBottomRightRadius='m'
      >
        {is_private ? (
          <Text
            variant='body'
            size='s'
            strength='strong'
            color='subdued'
            // Ensures footer height is not affected
            style={{ lineHeight: 16 }}
          >
            {is_scheduled_release && release_date
              ? messages.releases(release_date)
              : messages.hidden}
          </Text>
        ) : (
          <>
            <Flex direction='row' gap='xs' alignItems='center'>
              <IconRepost size='s' color='subdued' />
              <Text variant='label' color='subdued'>
                {formatCount(repost_count ?? 0)}
              </Text>
            </Flex>
            <Flex direction='row' gap='xs' alignItems='center'>
              <IconHeart size='s' color='subdued' />
              <Text variant='label' color='subdued'>
                {formatCount(save_count ?? 0)}
              </Text>
            </Flex>
          </>
        )}
        {isPurchase && !isOwner ? (
          <LockedStatusBadge variant='premium' locked={!access?.stream} />
        ) : null}
        {offline ? (
          <CollectionDownloadStatusIndicator collectionId={id} size='s' />
        ) : null}
      </Flex>
    </Paper>
  )
}

// Memoize CollectionCard to prevent unnecessary re-renders when props haven't changed
// This is critical for performance when rendering many cards in a list
export const CollectionCard = memo(
  CollectionCardComponent,
  (prevProps, nextProps) => {
    // Only re-render if id, onPress, or noNavigation actually change
    return (
      prevProps.id === nextProps.id &&
      prevProps.noNavigation === nextProps.noNavigation &&
      prevProps.onPress === nextProps.onPress
    )
  }
)
