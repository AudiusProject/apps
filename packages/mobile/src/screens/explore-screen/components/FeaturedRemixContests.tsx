import React from 'react'

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
    FeatureFlags.CONTESTS_PAGE
  )

  const { data: exploreContent, isPending: isExplorePending } =
    useExploreContent({ enabled: inView })

  // Old-card path needs the hydrated track list; new-card path resolves per
  // card internally so we skip this fetch when the flag is enabled.
  const { data: remixContests } = useTracks(
    exploreContent?.featuredRemixContests,
    { enabled: inView && !isContestsPageEnabled }
  )

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
            data={exploreContent?.featuredRemixContests?.map((trackId) => ({
              trackId
            }))}
            renderItem={({ item }) => <ContestCard trackId={item.trackId} />}
            horizontal
            carouselSpacing={spacing.l}
            isLoading={isExplorePending}
            LoadingCardComponent={TrackCardSkeleton}
          />
        ) : (
          <CardList
            data={remixContests?.map((track) => ({ trackId: track.track_id }))}
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
