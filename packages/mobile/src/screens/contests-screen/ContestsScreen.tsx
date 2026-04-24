import React, { useCallback } from 'react'

import { useAllRemixContests } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'

import { Flex, IconTrophy, Text } from '@audius/harmony-native'
import { ContestCard, ContestCardSkeleton } from 'app/components/contest-card'
import { Screen, ScreenContent, ScrollView } from 'app/components/core'

const messages = {
  title: 'Contests',
  empty: 'There are no contests right now. Check back soon!'
}

const HERO_SKELETON_COUNT = 1
const GRID_SKELETON_COUNT = 4
// Bounded first page so we don't fan out 25 concurrent image requests on
// mount; the rest load as the user scrolls.
const CONTEST_PAGE_SIZE = 6
// Pixels from the bottom at which we trigger the next page fetch.
const END_REACHED_THRESHOLD = 400

export const ContestsScreen = () => {
  const { isEnabled: isContestsPageEnabled } = useFeatureFlag(
    FeatureFlags.CONTESTS
  )
  const {
    data,
    isPending,
    isError,
    isSuccess,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useAllRemixContests(
    { pageSize: CONTEST_PAGE_SIZE },
    { enabled: isContestsPageEnabled }
  )

  const contests = isContestsPageEnabled ? (data ?? []) : []
  const [heroTrackId, ...gridTrackIds] = contests
  const showSkeletons =
    isContestsPageEnabled && (isPending || (!isSuccess && !isError))
  const showEmpty = isSuccess && contests.length === 0

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!hasNextPage || isFetchingNextPage) return
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height)
      if (distanceFromBottom <= END_REACHED_THRESHOLD) {
        fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  return (
    <Screen
      url='/contests'
      variant='secondary'
      icon={IconTrophy}
      title={messages.title}
    >
      <ScreenContent>
        <ScrollView onScroll={handleScroll} scrollEventThrottle={200}>
          <Flex direction='column' gap='l' mv='l' mh='m'>
            {showSkeletons ? (
              <Flex direction='column' gap='l'>
                {Array.from({ length: HERO_SKELETON_COUNT }).map((_, i) => (
                  <ContestCardSkeleton
                    key={`hero-skeleton-${i}`}
                    variant='hero'
                  />
                ))}
                {Array.from({ length: GRID_SKELETON_COUNT }).map((_, i) => (
                  <ContestCardSkeleton
                    key={`grid-skeleton-${i}`}
                    variant='grid'
                  />
                ))}
              </Flex>
            ) : showEmpty ? (
              <Text variant='body' size='l' color='subdued'>
                {messages.empty}
              </Text>
            ) : (
              <Flex direction='column' gap='l'>
                {heroTrackId != null ? (
                  <ContestCard trackId={heroTrackId} variant='hero' />
                ) : null}
                {gridTrackIds.map((id) => (
                  <ContestCard key={id} trackId={id} variant='grid' />
                ))}
                {isFetchingNextPage
                  ? Array.from({ length: CONTEST_PAGE_SIZE }).map((_, i) => (
                      <ContestCardSkeleton
                        key={`load-more-skeleton-${i}`}
                        variant='grid'
                      />
                    ))
                  : null}
              </Flex>
            )}
          </Flex>
        </ScrollView>
      </ScreenContent>
    </Screen>
  )
}
