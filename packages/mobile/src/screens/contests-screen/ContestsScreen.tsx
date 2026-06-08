import React, { useCallback } from 'react'

import { useAllRemixContests } from '@audius/common/api'

import {
  Box,
  Flex,
  IconTrophy,
  LoadingSpinner,
  Text
} from '@audius/harmony-native'
import { ContestCard, ContestCardSkeleton } from 'app/components/contest-card'
import { FlatList, Screen, ScreenContent } from 'app/components/core'

const messages = {
  title: 'Contests',
  empty: 'There are no contests right now. Check back soon!'
}

const HERO_SKELETON_COUNT = 1
const GRID_SKELETON_COUNT = 4

export const ContestsScreen = () => {
  const {
    data,
    isPending,
    isError,
    isSuccess,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useAllRemixContests()

  const contests = data ?? []
  const [heroTrackId, ...gridTrackIds] = contests
  const showSkeletons = isPending || (!isSuccess && !isError)
  const showEmpty = isSuccess && contests.length === 0

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const renderItem = useCallback(
    ({ item }: { item: number }) => (
      <ContestCard trackId={item} variant='grid' />
    ),
    []
  )

  const keyExtractor = useCallback((id: number) => String(id), [])

  const ItemSeparator = useCallback(() => <Box h='l' />, [])

  return (
    <Screen
      url='/contests'
      variant='secondary'
      icon={IconTrophy}
      title={messages.title}
    >
      <ScreenContent>
        {showSkeletons ? (
          <Flex direction='column' gap='l' mv='l' mh='m'>
            {Array.from({ length: HERO_SKELETON_COUNT }).map((_, i) => (
              <ContestCardSkeleton key={`hero-skeleton-${i}`} variant='hero' />
            ))}
            {Array.from({ length: GRID_SKELETON_COUNT }).map((_, i) => (
              <ContestCardSkeleton key={`grid-skeleton-${i}`} variant='grid' />
            ))}
          </Flex>
        ) : showEmpty ? (
          <Flex direction='column' mv='l' mh='m'>
            <Text variant='body' size='l' color='subdued'>
              {messages.empty}
            </Text>
          </Flex>
        ) : (
          <FlatList
            data={gridTrackIds}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ItemSeparatorComponent={ItemSeparator}
            ListHeaderComponent={
              heroTrackId != null ? (
                <Box mb='l'>
                  <ContestCard trackId={heroTrackId} variant='hero' />
                </Box>
              ) : null
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <Flex justifyContent='center' pv='l'>
                  <Box w={24}>
                    <LoadingSpinner />
                  </Box>
                </Flex>
              ) : null
            }
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{
              paddingVertical: 16,
              paddingHorizontal: 12
            }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScreenContent>
    </Screen>
  )
}
