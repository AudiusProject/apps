import { useQuery } from '@tanstack/react-query'

import {
  GenreSuggestion,
  POPULAR_GENRES_LIMIT,
  mergeGenreSuggestions,
  normalizeGenre
} from '~/utils/genres'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useQueryContext } from '../utils'

const STALE_TIME = 15 * 60 * 1000

export const getPopularGenresQueryKey = () =>
  [QUERY_KEYS.popularGenres] as unknown as QueryKey<GenreSuggestion[]>

export const usePopularGenres = (options?: QueryOptions) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: getPopularGenresQueryKey(),
    queryFn: async () => {
      try {
        const sdk = await audiusSdk()
        const json = await sdk.genres.getPopularGenres({
          limit: POPULAR_GENRES_LIMIT
        })
        const communityGenres =
          json.data?.map((genre) => ({
            label: normalizeGenre(genre.name),
            value: genre.name,
            count: genre.count
          })) ?? []

        return mergeGenreSuggestions(communityGenres)
      } catch {
        return mergeGenreSuggestions([])
      }
    },
    staleTime: STALE_TIME,
    gcTime: STALE_TIME,
    ...options,
    enabled: options?.enabled !== false
  })
}
