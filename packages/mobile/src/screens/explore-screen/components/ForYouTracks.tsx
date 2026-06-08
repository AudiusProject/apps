import React from 'react'

import { useRecommendedTracks } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import { QueueSource } from '@audius/common/store'
import { GetRecommendedTracksTimeEnum } from '@audius/sdk'

import { useExploreSectionTracking } from '../hooks/useExploreSectionTracking'

import { ExploreSection } from './ExploreSection'
import { TrackTileCarousel } from './TrackTileCarousel'

export const ForYouTracks = () => {
  const { inView, InViewWrapper } =
    useExploreSectionTracking('Recommended Tracks')
  const { data: recommendedTracks, isPending } = useRecommendedTracks(
    { pageSize: 10, timeRange: GetRecommendedTracksTimeEnum.Week },
    { enabled: inView }
  )

  return (
    <InViewWrapper>
      <ExploreSection title={messages.forYou}>
        <TrackTileCarousel
          tracks={recommendedTracks}
          isLoading={isPending}
          source={QueueSource.EXPLORE}
        />
      </ExploreSection>
    </InViewWrapper>
  )
}
