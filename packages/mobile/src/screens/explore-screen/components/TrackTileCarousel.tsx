import React, { useMemo } from 'react'

import { useToggleTrack } from '@audius/common/hooks'
import { Kind } from '@audius/common/models'
import type { Queueable, QueueSource } from '@audius/common/store'
import { makeUid } from '@audius/common/utils'
import { ScrollView } from 'react-native'

import { Flex } from '@audius/harmony-native'
import { LineupTileSkeleton, TrackTile } from 'app/components/lineup-tile'

interface TrackTileCarouselProps {
  tracks?: number[]
  isLoading?: boolean
  source: QueueSource
}

const CarouselItem = ({
  id,
  uid,
  pairIndex,
  trackIndex,
  source,
  entries
}: {
  id: number
  uid: string
  pairIndex: number
  trackIndex: number
  source: QueueSource
  entries: Queueable[]
}) => {
  const { togglePlay } = useToggleTrack({
    id,
    uid,
    source,
    entries
  })

  return (
    <TrackTile
      key={id}
      id={id}
      uid={uid}
      togglePlay={togglePlay}
      index={pairIndex * 2 + trackIndex}
    />
  )
}

export const TrackTileCarousel = ({
  tracks,
  isLoading,
  source
}: TrackTileCarouselProps) => {
  const entries = useMemo(() => {
    if (!tracks) return []
    return tracks.map((id) => ({
      id,
      uid: makeUid(Kind.TRACKS, id, source),
      source
    }))
  }, [tracks, source])

  if (isLoading || !tracks) {
    return (
      <Flex direction='row' mh={-16}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {[0, 1].map((columnIndex) => (
            <Flex
              key={columnIndex}
              direction='column'
              gap='m'
              w={343}
              mr={columnIndex === 0 ? 16 : 0}
            >
              <LineupTileSkeleton noShimmer />
              <LineupTileSkeleton noShimmer />
            </Flex>
          ))}
        </ScrollView>
      </Flex>
    )
  }

  // Chunk tracks into pairs for 2-track columns
  const trackPairs: number[][] = []
  for (let i = 0; i < tracks.length; i += 2) {
    trackPairs.push(tracks.slice(i, i + 2))
  }

  return (
    <Flex direction='row' mh={-16}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {trackPairs.map((pair, pairIndex) => (
          <Flex
            key={pairIndex}
            direction='column'
            gap='m'
            w={343}
            mr={pairIndex < trackPairs.length - 1 ? 16 : 0}
          >
            {pair.map((track, trackIndex) => {
              const entryIndex = pairIndex * 2 + trackIndex
              return (
                <CarouselItem
                  key={track}
                  id={track}
                  uid={entries[entryIndex].uid}
                  pairIndex={pairIndex}
                  trackIndex={trackIndex}
                  source={source}
                  entries={entries}
                />
              )
            })}
          </Flex>
        ))}
      </ScrollView>
    </Flex>
  )
}
