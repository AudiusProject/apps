import React from 'react'

import { useAllRemixContests } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'

import { Flex, IconRemix, Text } from '@audius/harmony-native'
import { ContestCard } from 'app/components/contest-card'
import { Screen, ScreenContent, ScrollView } from 'app/components/core'

const messages = {
  title: 'Contests',
  empty: 'There are no contests right now. Check back soon!'
}

export const ContestsScreen = () => {
  const { isEnabled: isContestsPageEnabled } = useFeatureFlag(
    FeatureFlags.CONTESTS_PAGE
  )
  const { data, isSuccess } = useAllRemixContests(undefined, {
    enabled: isContestsPageEnabled
  })

  const contests = isContestsPageEnabled ? (data ?? []) : []
  const [heroTrackId, ...gridTrackIds] = contests
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
            {showEmpty ? (
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
