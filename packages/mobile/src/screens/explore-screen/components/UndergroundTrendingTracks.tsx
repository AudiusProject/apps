import React, { useMemo } from 'react'

import { useTrendingUnderground } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import { QueueSource } from '@audius/common/store'

import { useDeferredElement } from '../../../hooks/useDeferredElement'

import { ExploreSection } from './ExploreSection'
import { TrackTileCarousel } from './TrackTileCarousel'

export const UndergroundTrendingTracks = () => {
  const { inView, InViewWrapper } = useDeferredElement()
  const { data: undergroundTrendingTracks, isPending } = useTrendingUnderground(
    { pageSize: 10 },
    { enabled: inView }
  )

  const trackIds = useMemo(() => {
    return undergroundTrendingTracks?.map(({ id }) => id) ?? []
  }, [undergroundTrendingTracks])

  return (
    <InViewWrapper>
      <ExploreSection
        title={messages.undergroundTrending}
        viewAllLink='TrendingUnderground'
      >
        <TrackTileCarousel
          tracks={trackIds}
          isLoading={isPending || !inView}
          source={QueueSource.EXPLORE}
        />
      </ExploreSection>
    </InViewWrapper>
  )
}
