import React from 'react'

import { useAllRemixContests } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'

import { Flex, IconRemix, Text } from '@audius/harmony-native'
import { ContestCard, ContestCardSkeleton } from 'app/components/contest-card'
import { Screen, ScreenContent, ScrollView } from 'app/components/core'

const messages = {
  title: 'Contests',
  empty: 'There are no contests right now. Check back soon!'
}

const HERO_SKELETON_COUNT = 1
const GRID_SKELETON_COUNT = 4

export const ContestsScreen = () => {
  const { isEnabled: isContestsPageEnabled } = useFeatureFlag(
    FeatureFlags.CONTESTS
  )
  const { data, isPending, isError, isSuccess } = useAllRemixContests(
    undefined,
    { enabled: isContestsPageEnabled }
  )

  const contests = isContestsPageEnabled ? (data ?? []) : []
  const [heroTrackId, ...gridTrackIds] = contests
  const showSkeletons =
    isContestsPageEnabled && (isPending || (!isSuccess && !isError))
  const showEmpty = isSuccess && contests.length === 0

  return (
    <Screen
      url='/contests'
      variant='secondary'
      icon={IconRemix}
      title={messages.title}
    >
      <ScreenContent>
        <ScrollView>
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
              </Flex>
            )}
          </Flex>
        </ScrollView>
      </ScreenContent>
    </Screen>
  )
}
