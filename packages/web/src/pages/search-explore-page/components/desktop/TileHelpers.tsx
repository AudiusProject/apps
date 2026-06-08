import { useCallback, useMemo } from 'react'

import { useToggleTrack } from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import type { Queueable } from '@audius/common/store'
import { QueueSource } from '@audius/common/store'
import { Flex } from '@audius/harmony'

import { TrackTile as DesktopTrackTile } from 'components/track/desktop/TrackTile'
import { TrackTile as MobileTrackTile } from 'components/track/mobile/TrackTile'
import { TrackTileSize } from 'components/track/types'
import { useIsMobile } from 'hooks/useIsMobile'

import { DESKTOP_RESPONSIVE_TILE_WIDTH, MOBILE_TILE_WIDTH } from './constants'

// Wrapper component to make tiles playable
export const PlayableTile = ({
  id,
  index,
  source = QueueSource.EXPLORE,
  entries
}: {
  id: ID
  index: number
  source?: QueueSource
  entries?: Queueable[]
}) => {
  const isMobile = useIsMobile()
  const Tile = isMobile ? MobileTrackTile : DesktopTrackTile

  const { togglePlay, isTrackPlaying } = useToggleTrack({
    id,
    source,
    entries
  })

  // Create lineup-style togglePlay function that TrackTile expects
  const handleTogglePlay = useCallback(
    (trackId: ID) => {
      if (trackId === id) {
        togglePlay()
      }
    },
    [id, togglePlay]
  )

  return (
    // @ts-ignore - track tile accepts extra props
    <Tile
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
  const tileWidth = isMobile ? MOBILE_TILE_WIDTH : DESKTOP_RESPONSIVE_TILE_WIDTH
  const pairs = []
  for (let i = 0; i < data.length; i += 2) {
    pairs.push(data.slice(i, i + 2))
  }

  const entries = useMemo(
    () =>
      data.map((id) => ({
        id,
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
  const tileWidth = isMobile ? MOBILE_TILE_WIDTH : DESKTOP_RESPONSIVE_TILE_WIDTH

  const tileProps = {
    togglePlay: () => {},
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
          {/* @ts-ignore - track tile accepts extra props */}
          <Tile
            {...tileProps}
            key={`${i}-0`}
            id={0}
            index={0}
            statSize={isMobile ? 'large' : 'small'}
          />
          {/* @ts-ignore - track tile accepts extra props */}
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
