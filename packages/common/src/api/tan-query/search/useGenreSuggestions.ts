import { useQuery } from '@tanstack/react-query'

import {
  GenreSuggestion,
  mergeGenreSuggestions,
  normalizeGenre
} from '~/utils/genres'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useQueryContext } from '../utils'

const COMMUNITY_GENRE_LOOKBACK_DAYS = 30
const MIN_COMMUNITY_GENRE_COUNT = 2

const getGenreMetricsStartTime = () => {
  const lookbackMs = COMMUNITY_GENRE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  return Math.floor((Date.now() - lookbackMs) / 1000)
}

export const getGenreSuggestionsQueryKey = () =>
  [QUERY_KEYS.genreSuggestions] as unknown as QueryKey<GenreSuggestion[]>

export const useGenreSuggestions = (options?: QueryOptions) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: getGenreSuggestionsQueryKey(),
    queryFn: async () => {
      try {
        const sdk = await audiusSdk()
        const json = await sdk.genres.getPopularGenres({
          startTime: getGenreMetricsStartTime(),
          minCount: MIN_COMMUNITY_GENRE_COUNT
        })
        const communityGenres =
          json.data
            ?.filter((genre) => genre.count >= MIN_COMMUNITY_GENRE_COUNT)
            .map((genre) => ({
              label: normalizeGenre(genre.name),
              value: genre.name,
              count: genre.count
            })) ?? []

        return mergeGenreSuggestions(communityGenres)
      } catch {
        return mergeGenreSuggestions([])
      }
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    ...options,
    enabled: options?.enabled !== false
  })
}
