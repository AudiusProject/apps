import React, { useCallback, useMemo } from 'react'

import { useToggleTrack } from '@audius/common/hooks'
import { ID, Kind, UID } from '@audius/common/models'
import { QueueSource } from '@audius/common/store'
import { makeUid } from '@audius/common/utils'
import { Flex } from '@audius/harmony'

import { TrackTile as DesktopTrackTile } from 'components/track/desktop/TrackTile'
import { TrackTile as MobileTrackTile } from 'components/track/mobile/TrackTile'
import { TrackTileSize } from 'components/track/types'
import { useIsMobile } from 'hooks/useIsMobile'

import { MOBILE_TILE_WIDTH, TILE_WIDTH } from './constants'

// New playback system tile (for For You section)
const PlayableTileNew = ({
  id,
  index,
  onPlay,
  isCurrentTrack,
  isPlaying,
  lineupId,
  currentTrackId,
  currentLineupId
}: {
  id: ID
  index: number
  onPlay: (trackId: number) => void
  isCurrentTrack: boolean
  isPlaying: boolean
  lineupId: string
  currentTrackId?: number | null
  currentLineupId?: string | null
}) => {
  const isMobile = useIsMobile()
  const Tile = isMobile ? MobileTrackTile : DesktopTrackTile
  const uid = useMemo(() => makeUid(Kind.TRACKS, id, QueueSource.EXPLORE), [id])

  const handleTogglePlay = useCallback(
    (tileUid: UID, trackId: ID) => {
      // Call onPlay directly when this tile is clicked
      if (trackId === id) {
        onPlay(id)
      }
    },
    [id, onPlay]
  )

  return (
    <Tile
      uid={uid}
      id={id}
      index={index}
      togglePlay={handleTogglePlay}
      isActive={isCurrentTrack && isPlaying}
      size={TrackTileSize.SMALL}
      statSize={isMobile ? 'large' : 'small'}
      ordered={false}
      hasLoaded={() => {}}
      isLoading={false}
      isTrending={false}
      isFeed={false}
      // New playback system props
      lineupId={lineupId}
      currentTrackId={currentTrackId}
      currentLineupId={currentLineupId}
      isPlaying={isPlaying}
      onPlay={onPlay}
    />
  )
}

// Wrapper component to make tiles playable
export const PlayableTile = ({
  id,
  index,
  source = QueueSource.EXPLORE
}: {
  id: ID
  index: number
  source?: QueueSource
}) => {
  const isMobile = useIsMobile()
  const Tile = isMobile ? MobileTrackTile : DesktopTrackTile
  const uid = useMemo(() => makeUid(Kind.TRACKS, id, source), [id, source])

  const { togglePlay, isTrackPlaying } = useToggleTrack({
    id,
    uid,
    source
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
  source = QueueSource.EXPLORE,
  onPlay,
  currentTrackId,
  currentLineupId,
  isPlaying,
  lineupId
}: {
  data: number[]
  source?: QueueSource
  onPlay?: (trackId: number) => void
  currentTrackId?: number | null
  currentLineupId?: string | null
  isPlaying?: boolean
  lineupId?: string
}) => {
  const isMobile = useIsMobile()
  const tileWidth = isMobile ? MOBILE_TILE_WIDTH : TILE_WIDTH
  const pairs = []
  for (let i = 0; i < data.length; i += 2) {
    pairs.push(data.slice(i, i + 2))
  }

  // Use new playback system if onPlay is provided
  const useNewPlayback = !!onPlay && !!lineupId

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
            if (useNewPlayback) {
              return (
                <PlayableTileNew
                  key={id}
                  id={id}
                  index={pairIndex * 2 + idIndex}
                  onPlay={onPlay!}
                  isCurrentTrack={
                    currentLineupId === lineupId && currentTrackId === id
                  }
                  isPlaying={isPlaying ?? false}
                  lineupId={lineupId!}
                  currentTrackId={currentTrackId}
                  currentLineupId={currentLineupId}
                />
              )
            }
            return (
              <PlayableTile
                key={id}
                id={id}
                index={pairIndex * 2 + idIndex}
                source={source}
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
