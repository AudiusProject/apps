import React, { useMemo } from 'react'

import { useExploreContent, useTracks } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { exploreMessages as messages } from '@audius/common/messages'
import { FeatureFlags } from '@audius/common/services'

import { useTheme } from '@audius/harmony-native'
import { ContestCard } from 'app/components/contest-card'
import { CardList } from 'app/components/core'
import { RemixContestCard } from 'app/components/remix-carousel/RemixContestCard'
import { TrackCardSkeleton } from 'app/components/track/TrackCardSkeleton'

import { useDeferredElement } from '../../../hooks/useDeferredElement'

import { ExploreSection } from './ExploreSection'

export const FeaturedRemixContests = () => {
  const { spacing } = useTheme()
  const { InViewWrapper, inView } = useDeferredElement()
  const { isEnabled: isContestsPageEnabled } = useFeatureFlag(
    FeatureFlags.CONTESTS
  )

  const { data: exploreContent, isPending: isExplorePending } =
    useExploreContent({ enabled: inView })

  // The curated featured-contests list is a static JSON file (see
  // useExploreContent). Some entries can refer to tracks the artist has
  // since deleted or made private — when ContestCard hits one of those it
  // renders `null`, but CardList's row wrapper (a fixed-width View) keeps
  // the card-sized slot, leaving a visible gap in the carousel. Hydrating
  // the tracks here lets us filter the list down to ones a card will
  // actually render for.
  const { data: remixContests, isPending: isTracksPending } = useTracks(
    exploreContent?.featuredRemixContests,
    { enabled: inView }
  )

  const validTrackIds = useMemo(() => {
    if (!remixContests) return undefined
    return remixContests
      .filter((t) => !t.is_delete && !t.is_unlisted)
      .map((t) => t.track_id)
  }, [remixContests])

  const isLoading = isExplorePending || isTracksPending

  return (
    <InViewWrapper>
      <ExploreSection
        title={
          isContestsPageEnabled
            ? messages.contests
            : messages.featuredRemixContests
        }
      >
        {isContestsPageEnabled ? (
          <CardList
            data={validTrackIds?.map((trackId) => ({ trackId }))}
            renderItem={({ item }) => <ContestCard trackId={item.trackId} />}
            horizontal
            carouselSpacing={spacing.l}
            isLoading={isLoading}
            LoadingCardComponent={TrackCardSkeleton}
          />
        ) : (
          <CardList
            data={validTrackIds?.map((trackId) => ({ trackId }))}
            renderItem={({ item }) => (
              <RemixContestCard trackId={item.trackId} />
            )}
            horizontal
            carouselSpacing={spacing.l}
            LoadingCardComponent={TrackCardSkeleton}
          />
        )}
      </ExploreSection>
    </InViewWrapper>
  )
}
