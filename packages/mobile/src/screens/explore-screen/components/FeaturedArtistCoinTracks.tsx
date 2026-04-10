import React from 'react'

import { useFeaturedArtistCoinTracks } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import { QueueSource } from '@audius/common/store'

import { useExploreSectionTracking } from '../hooks/useExploreSectionTracking'

import { ExploreSection } from './ExploreSection'
import { TrackTileCarousel } from './TrackTileCarousel'

export const FeaturedArtistCoinTracks = () => {
  const { InViewWrapper, inView } =
    useExploreSectionTracking('Artist Coin Tracks')
  const { trackIds, isPending } = useFeaturedArtistCoinTracks({
    enabled: inView
  })

  return (
    <InViewWrapper>
      <ExploreSection title={messages.artistCoinExclusives}>
        <TrackTileCarousel
          tracks={trackIds}
          isLoading={isPending}
          source={QueueSource.EXPLORE}
        />
      </ExploreSection>
    </InViewWrapper>
  )
}
