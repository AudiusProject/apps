import { useCallback, useMemo } from 'react'

import { useFeelingLuckyTracks } from '@audius/common/api'
import { useToggleTrack } from '@audius/common/hooks'
import { exploreMessages as messages } from '@audius/common/messages'
import { UID, ID, Kind } from '@audius/common/models'
import { QueueSource } from '@audius/common/store'
import { makeUid } from '@audius/common/utils'
import { Text, Flex, Button, IconArrowRotate } from '@audius/harmony'

import { TrackTile as DesktopTrackTile } from 'components/track/desktop/TrackTile'
import { TrackTile as MobileTrackTile } from 'components/track/mobile/TrackTile'
import { TrackTileSize } from 'components/track/types'
import { useIsMobile } from 'hooks/useIsMobile'

import { useDeferredElement } from './useDeferredElement'

export const FeelingLuckySection = () => {
  const { ref, inView } = useDeferredElement()
  const isMobile = useIsMobile()
  const {
    data: feelingLuckyTrack,
    isFetching,
    refetch: refetchFeelingLucky
  } = useFeelingLuckyTracks({ limit: 1 }, { enabled: inView })

  // Create UID and togglePlay for feeling lucky track
  const feelingLuckyTrackId = feelingLuckyTrack?.[0]?.track_id ?? 0
  const feelingLuckyUid = useMemo(
    () =>
      feelingLuckyTrackId
        ? makeUid(Kind.TRACKS, feelingLuckyTrackId, QueueSource.EXPLORE)
        : '',
    [feelingLuckyTrackId]
  )

  const { togglePlay: toggleFeelingLucky, isTrackPlaying } = useToggleTrack({
    id: feelingLuckyTrackId,
    uid: feelingLuckyUid,
    source: QueueSource.EXPLORE
  })

  const handleTogglePlay = useCallback(
    (tileUid: UID, trackId: ID) => {
      if (tileUid === feelingLuckyUid && trackId === feelingLuckyTrackId) {
        toggleFeelingLucky()
      }
    },
    [feelingLuckyUid, feelingLuckyTrackId, toggleFeelingLucky]
  )

  const Tile = isMobile ? MobileTrackTile : DesktopTrackTile

  return (
    <Flex ref={ref} direction='column' ph={isMobile ? 'l' : undefined}>
      {!inView ? null : (
        <Flex gap='xl' direction='column'>
          <Flex justifyContent='space-between' gap='l' alignItems='center'>
            <Text
              variant={isMobile ? 'title' : 'heading'}
              size={isMobile ? 'l' : 'm'}
            >
              {messages.feelingLucky}
            </Text>
            <Button
              variant='secondary'
              isLoading={isFetching}
              size={isMobile ? 'xs' : 'small'}
              onClick={() => refetchFeelingLucky()}
              iconLeft={IconArrowRotate}
            >
              {messages.imFeelingLucky}
            </Button>
          </Flex>
          <Tile
            key={feelingLuckyTrackId}
            uid={feelingLuckyUid}
            id={feelingLuckyTrackId}
            isActive={isTrackPlaying}
            index={0}
            size={isMobile ? TrackTileSize.SMALL : TrackTileSize.LARGE}
            statSize={isMobile ? 'large' : 'small'}
            ordered={false}
            togglePlay={handleTogglePlay}
            hasLoaded={() => {}}
            isLoading={isFetching}
            isTrending={false}
            isFeed={false}
          />
        </Flex>
      )}
    </Flex>
  )
}
