import { useCallback } from 'react'

import { usePopularGenres } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import { route } from '@audius/common/utils'
import { Flex, SelectablePill, Text } from '@audius/harmony'
import { useNavigate } from 'react-router'

import Skeleton from 'components/skeleton/Skeleton'
import { useIsMobile } from 'hooks/useIsMobile'

import { useExploreSectionTracking } from './useExploreSectionTracking'

const SKELETON_COUNT = 10
const MAX_GENRES = 10

export const TrendingGenresSection = () => {
  const { ref, inView } = useExploreSectionTracking('Trending Genres')
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const { data: genreSuggestions, isPending } = usePopularGenres({
    enabled: inView
  })

  const handleGenrePress = useCallback(
    (genre: string) => {
      navigate(`${route.TRENDING_PAGE}?genre=${encodeURIComponent(genre)}`)
    },
    [navigate]
  )

  const topGenres = (genreSuggestions ?? [])
    .filter((genre) => genre.count !== undefined)
    .slice(0, MAX_GENRES)

  const showSkeleton = !inView || isPending

  if (!showSkeleton && topGenres.length === 0) {
    return null
  }

  return (
    <Flex ref={ref} direction='column' gap='l' w='100%'>
      <Text
        variant={isMobile ? 'title' : 'heading'}
        size={isMobile ? 'l' : 'm'}
      >
        {messages.trendingGenres}
      </Text>
      <Flex gap='s' wrap='wrap' alignItems='center'>
        {showSkeleton
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <Skeleton key={i} h={32} w={96} borderRadius='9999px' noShimmer />
            ))
          : topGenres.map((genre) => (
              <SelectablePill
                key={genre.value}
                type='button'
                size='large'
                label={genre.label}
                onClick={() => handleGenrePress(genre.value)}
              />
            ))}
      </Flex>
    </Flex>
  )
}
