import React from 'react'

import { useExploreContent } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import { useTheme } from '@audius/harmony-native'
import { ContestCard } from 'app/components/contest-card'
import { CardList } from 'app/components/core'
import { TrackCardSkeleton } from 'app/components/track/TrackCardSkeleton'

import { useDeferredElement } from '../../../hooks/useDeferredElement'

import { ExploreSection } from './ExploreSection'

export const FeaturedRemixContests = () => {
  const { spacing } = useTheme()
  const { InViewWrapper, inView } = useDeferredElement()

  const { data: exploreContent, isPending } = useExploreContent({
    enabled: inView
  })

  return (
    <InViewWrapper>
      <ExploreSection title={messages.contests}>
        <CardList
          data={exploreContent?.featuredRemixContests?.map((trackId) => ({
            trackId
          }))}
          renderItem={({ item }) => <ContestCard trackId={item.trackId} />}
          horizontal
          carouselSpacing={spacing.l}
          isLoading={isPending}
          LoadingCardComponent={TrackCardSkeleton}
        />
      </ExploreSection>
    </InViewWrapper>
  )
}
