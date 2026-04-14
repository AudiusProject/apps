import React, { useCallback, useMemo } from 'react'

import { useToggleTrack } from '@audius/common/hooks'
import { ID, Kind, UID } from '@audius/common/models'
import type { Queueable } from '@audius/common/store'
import { QueueSource } from '@audius/common/store'
import { makeUid } from '@audius/common/utils'
import { Flex } from '@audius/harmony'

import { TrackTile as DesktopTrackTile } from 'components/track/desktop/TrackTile'
import { TrackTile as MobileTrackTile } from 'components/track/mobile/TrackTile'
import { TrackTileSize } from 'components/track/types'
import { useIsMobile } from 'hooks/useIsMobile'

import { MOBILE_TILE_WIDTH, TILE_WIDTH } from './constants'

// Wrapper component to make tiles playable
export const PlayableTile = ({
  id,
  uid,
  index,
  source = QueueSource.EXPLORE,
  entries
}: {
  id: ID
  uid: UID
  index: number
  source?: QueueSource
  entries?: Queueable[]
}) => {
  const isMobile = useIsMobile()
  const Tile = isMobile ? MobileTrackTile : DesktopTrackTile

  const { togglePlay, isTrackPlaying } = useToggleTrack({
    id,
    uid,
    source,
    entries
  })

  // Create lineup-style togglePlay function that TrackTile expects
  const handleTogglePlay = useCallback(
    (tileUid: UID, trackId: ID) => {
      if (tileUid === uid && trackId === id) {
        togglePlay()
      }
    },
    [uid, id, togglePlay]
  )

  return (
    <Tile
      uid={uid}
      id={id}
      index={index}
      togglePlay={handleTogglePlay}
      isActive={isTrackPlaying}
      size={TrackTileSize.SMALL}
      statSize={isMobile ? 'large' : 'small'}
      ordered={false}
      hasLoaded={() => {}}
      isLoading={false}
      isTrending={false}
      isFeed={false}
    />
  )
}

export const TilePairs = ({
  data,
  source = QueueSource.EXPLORE
}: {
  data: number[]
  source?: QueueSource
}) => {
  const isMobile = useIsMobile()
  const tileWidth = isMobile ? MOBILE_TILE_WIDTH : TILE_WIDTH
  const pairs = []
  for (let i = 0; i < data.length; i += 2) {
    pairs.push(data.slice(i, i + 2))
  }

  const entries = useMemo(
    () =>
      data.map((id) => ({
        id,
        uid: makeUid(Kind.TRACKS, id, source),
        source
      })),
    [data, source]
  )

  return (
    <>
      {pairs.map((pair, pairIndex) => (
        <Flex
          key={pairIndex}
          direction='column'
          gap='m'
          css={{ minWidth: tileWidth, width: tileWidth }}
        >
          {pair.map((id, idIndex) => {
            const entryIndex = pairIndex * 2 + idIndex
            return (
              <PlayableTile
                key={id}
                id={id}
                uid={entries[entryIndex].uid}
                index={entryIndex}
                source={source}
                entries={entries}
              />
            )
          })}
        </Flex>
      ))}
    </>
  )
}

export const TileSkeletons = ({ noShimmer }: { noShimmer?: boolean }) => {
  const isMobile = useIsMobile()
  const Tile = isMobile ? MobileTrackTile : DesktopTrackTile
  const tileWidth = isMobile ? MOBILE_TILE_WIDTH : TILE_WIDTH

  const tileProps = {
    togglePlay: () => {},
    uid: '',
    isActive: false,
    size: TrackTileSize.SMALL,
    noShimmer,
    ordered: false,
    hasLoaded: () => {},
    isFeed: false,
    isLoading: true,
    isTrending: false
  }
  return (
    <>
      {Array.from({ length: 2 }).map((_, i) => (
        <Flex
          key={i}
          direction='column'
          gap='m'
          css={{ minWidth: tileWidth, width: tileWidth }}
        >
          <Tile
            {...tileProps}
            key={`${i}-0`}
            id={0}
            index={0}
            statSize={isMobile ? 'large' : 'small'}
          />
          <Tile
            {...tileProps}
            key={`${i}-1`}
            id={0}
            index={1}
            statSize={isMobile ? 'large' : 'small'}
          />
        </Flex>
      ))}
    </>
  )
}
