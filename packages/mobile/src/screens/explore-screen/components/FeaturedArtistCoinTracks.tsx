import React from 'react'

import { useExploreContent } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import { QueueSource } from '@audius/common/store'

import { useDeferredElement } from '../../../hooks/useDeferredElement'

import { ExploreSection } from './ExploreSection'
import { TrackTileCarousel } from './TrackTileCarousel'

export const FeaturedArtistCoinTracks = () => {
  const { InViewWrapper, inView } = useDeferredElement()
  const { data, isPending } = useExploreContent({ enabled: inView })

  return (
    <InViewWrapper>
      {data?.featuredArtistCoinTracks.length ? (
        <ExploreSection title={messages.artistCoinExclusives}>
          <TrackTileCarousel
            tracks={data?.featuredArtistCoinTracks}
            isLoading={isPending}
            source={QueueSource.EXPLORE}
          />
        </ExploreSection>
      ) : null}
    </InViewWrapper>
  )
}
