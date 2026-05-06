import React from 'react'

import {
  useAllRemixContests,
  useExploreContent,
  useTracks
} from '@audius/common/api'
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

  // When the contests feature is on the section title is just
  // "Contests" — switch the data source from the curated featured
  // list to the full live list so the carousel actually matches the
  // label (Julian: "the full list of contests isn't showing on the
  // mobile discovery page"). Backed by `useAllRemixContests`, the same
  // source the dedicated /contests screen uses.
  const { data: allContestTrackIds, isPending: isAllContestsPending } =
    useAllRemixContests(undefined, { enabled: inView && isContestsPageEnabled })

  const { data: exploreContent, isPending: isExplorePending } =
    useExploreContent({ enabled: inView && !isContestsPageEnabled })

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
            data={(allContestTrackIds ?? []).map((trackId) => ({ trackId }))}
            renderItem={({ item }) => <ContestCard trackId={item.trackId} />}
            horizontal
            carouselSpacing={spacing.l}
            isLoading={isAllContestsPending}
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
            isLoading={isExplorePending}
            LoadingCardComponent={TrackCardSkeleton}
          />
        )}
      </ExploreSection>
    </InViewWrapper>
  )
}
