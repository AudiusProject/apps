import React from 'react'

import { useFeelingLuckyTracks } from '@audius/common/api'
import { useToggleTrack } from '@audius/common/hooks'
import { exploreMessages as messages } from '@audius/common/messages'
import { QueueSource } from '@audius/common/store'

import { Button, Flex, Text } from '@audius/harmony-native'
import { LineupTileSkeleton, TrackTile } from 'app/components/lineup-tile'

import { useDeferredElement } from '../../../hooks/useDeferredElement'

export const FeelingLucky = () => {
  const { inView, InViewWrapper } = useDeferredElement()
  const {
    data: feelingLuckyTracks = [],
    refetch: refetchFeelingLucky,
    isPending,
    isFetching
  } = useFeelingLuckyTracks({ limit: 1 }, { enabled: inView })
  const track = feelingLuckyTracks[0]

  const { togglePlay } = useToggleTrack({
    id: track?.track_id ?? null,
    source: QueueSource.EXPLORE
  })

  return (
    <InViewWrapper>
      <Flex justifyContent={'flex-start'} gap='m'>
        <Flex direction='row' justifyContent='space-between'>
          <Text variant='title' size='l' textAlign={'left'}>
            {messages.feelingLucky}
          </Text>
          <Button
            variant='secondary'
            size='xs'
            isLoading={isFetching}
            onPress={() => refetchFeelingLucky()}
          >
            {messages.imFeelingLucky}
          </Button>
        </Flex>
        {!inView || isPending || isFetching ? (
          <LineupTileSkeleton noShimmer />
        ) : track ? (
          <TrackTile
            key={track.track_id}
            id={track.track_id}
            togglePlay={togglePlay}
            index={0}
          />
        ) : null}
      </Flex>
    </InViewWrapper>
  )
}
