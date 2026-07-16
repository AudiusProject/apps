import React, { useCallback } from 'react'

import { usePopularGenres } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import { trendingPageActions } from '@audius/common/store'
import { toTrendingGenreValue } from '@audius/common/utils'
import { useDispatch } from 'react-redux'

import { Flex, SelectablePill, Skeleton } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

import { useExploreSectionTracking } from '../hooks/useExploreSectionTracking'

import { ExploreSection } from './ExploreSection'

const { setTrendingGenre } = trendingPageActions

const SKELETON_COUNT = 8
const MAX_GENRES = 10

export const TrendingGenres = () => {
  const { inView, InViewWrapper } = useExploreSectionTracking('Trending Genres')
  const dispatch = useDispatch()
  const navigation = useNavigation()

  const { data: genreSuggestions, isPending } = usePopularGenres({
    enabled: inView
  })

  const handleGenrePress = useCallback(
    (genre: string) => {
      dispatch(setTrendingGenre(toTrendingGenreValue(genre)))
      navigation.navigate('trending', { screen: 'Trending' })
    },
    [dispatch, navigation]
  )

  // Only the ranked (popular) genres carry a count; the merged static genres
  // do not. Show the top ranked genres in popularity order.
  const topGenres = (genreSuggestions ?? [])
    .filter((genre) => genre.count !== undefined)
    .slice(0, MAX_GENRES)

  const showSkeleton = !inView || isPending

  // Hide the section gracefully when there are no popular genres (empty
  // response or a failed request that fell back to the static list).
  if (!showSkeleton && topGenres.length === 0) {
    return null
  }

  return (
    <InViewWrapper>
      <ExploreSection title={messages.trendingGenres}>
        <Flex row wrap='wrap' gap='s' alignItems='center'>
          {showSkeleton
            ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <Skeleton key={i} h={36} w={96} borderRadius='2xl' noShimmer />
              ))
            : topGenres.map((genre) => (
                <SelectablePill
                  key={genre.value}
                  type='button'
                  size='large'
                  label={genre.label}
                  onPress={() => handleGenrePress(genre.value)}
                />
              ))}
        </Flex>
      </ExploreSection>
    </InViewWrapper>
  )
}
