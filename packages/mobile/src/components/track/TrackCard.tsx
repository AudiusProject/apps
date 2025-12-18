import { useCallback } from 'react'

import { useTrack, useCurrentUserId } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { SquareSizes, isContentUSDCPurchaseGated } from '@audius/common/models'
import { formatCount, formatSeconds } from '@audius/common/utils'
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

import { LockedStatusBadge } from '../core'
import { TrackImage } from '../image/TrackImage'
import { TrackDownloadStatusIndicator } from '../offline-downloads'

import { TrackCardSkeleton } from './TrackCardSkeleton'
import { TrackDogEar } from './TrackDogEar'

const messages = {
  repost: 'Reposts',
  favorites: 'Favorites',
  hidden: 'Hidden'
}

type TrackCardProps = {
  id: ID
  onPress?: (e: GestureResponderEvent) => void
  noNavigation?: boolean
}

export const TrackCard = (props: TrackCardProps) => {
  const { id, onPress, noNavigation } = props

  const { data: partialTrack } = useTrack(id, {
    select: (track) =>
      pick(
        track,
        'title',
        'owner_id',
        'repost_count',
        'save_count',
        'is_unlisted',
        'access',
        'stream_conditions',
        'duration',
        'offline'
      )
  })
  const {
    title,
    owner_id,
    repost_count,
    save_count,
    is_unlisted,
    access,
    stream_conditions,
    duration,
    offline
  } = partialTrack ?? {}
  const { data: accountId } = useCurrentUserId()

  const navigation = useNavigation()

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      onPress?.(e)
      if (noNavigation) return
      navigation.navigate('Track', { trackId: id })
    },
    [onPress, noNavigation, navigation, id]
  )

  if (!partialTrack) {
    console.warn('Track missing for TrackCard, preventing render')
    return <TrackCardSkeleton />
  }

  const isOwner = accountId === owner_id
  const isPurchase = isContentUSDCPurchaseGated(stream_conditions)

  return (
    <Paper border='default' onPress={handlePress}>
      <TrackDogEar trackId={id} />
      <Flex p='s' gap='s'>
        <TrackImage
          trackId={id}
          size={SquareSizes.SIZE_480_BY_480}
          style={{ flex: 1 }}
        />
        <Text variant='title' textAlign='center' numberOfLines={1}>
          {title}
        </Text>
        <UserLink
          userId={owner_id!}
          textAlign='center'
          style={{ justifyContent: 'center' }}
        />
        {duration && (
          <Text variant='body' size='s' textAlign='center' color='subdued'>
            {formatSeconds(duration)}
          </Text>
        )}
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
        {is_unlisted ? (
          <Text
            variant='body'
            size='s'
            strength='strong'
            color='subdued'
            // Ensures footer height is not affected
            style={{ lineHeight: 16 }}
          >
            {messages.hidden}
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
          <TrackDownloadStatusIndicator trackId={id} size='s' />
        ) : null}
      </Flex>
    </Paper>
  )
}
