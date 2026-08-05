import React from 'react'

import { useAllRemixContests } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import { useWindowDimensions } from 'react-native'

import { useTheme } from '@audius/harmony-native'
import { ContestCard, ContestCardSkeleton } from 'app/components/contest-card'
import { CardList } from 'app/components/core'

import { useDeferredElement } from '../../../hooks/useDeferredElement'

import { ExploreSection } from './ExploreSection'

// Carousel slot width for contest cards. The dedicated /contests screen
// renders cards at roughly full screen width minus its horizontal margins;
// the Explore carousel matches that visual width while leaving a small
// peek of the next card to invite horizontal swipe.
const CONTEST_CARD_PEEK = 48

export const FeaturedRemixContests = () => {
  const { spacing } = useTheme()
  const { width: windowWidth } = useWindowDimensions()
  const contestCardWidth = windowWidth - CONTEST_CARD_PEEK
  const { InViewWrapper, inView } = useDeferredElement()
  const { data: allContestTrackIds, isPending: isAllContestsPending } =
    useAllRemixContests(undefined, { enabled: inView })

  return (
    <InViewWrapper>
      <ExploreSection title={messages.contests}>
        <CardList
          data={(allContestTrackIds ?? []).map((trackId) => ({ trackId }))}
          renderItem={({ item }) => <ContestCard trackId={item.trackId} />}
          horizontal
          carouselSpacing={spacing.l}
          horizontalCardWidth={contestCardWidth}
          isLoading={isAllContestsPending}
          LoadingCardComponent={() => <ContestCardSkeleton />}
        />
      </ExploreSection>
    </InViewWrapper>
  )
}
