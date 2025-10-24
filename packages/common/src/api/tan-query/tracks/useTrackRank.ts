import { useQuery } from '@tanstack/react-query'

import { trendingIdsFromSDK } from '~/adapters/trending'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'
import { removeNullable } from '~/utils'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey } from '../types'

type GetTrendingIdsArgs = {
  genre?: string
}

const messages = {
  year: 'Year',
  month: 'Month',
  week: 'Week'
}

type TrendingIds = {
  year?: ID[]
  month?: ID[]
  week?: ID[]
}

export const getTrendingIdsQueryKey = (args?: GetTrendingIdsArgs) => {
  return [
    QUERY_KEYS.trendingIds,
    { genre: args?.genre }
  ] as unknown as QueryKey<TrendingIds | null>
}

/**
 * Hook that returns trending track IDs for all time periods
 */
export const useGetTrendingIds = (args?: GetTrendingIdsArgs) => {
  const { audiusSdk } = useQueryContext()
  return useQuery({
    queryKey: getTrendingIdsQueryKey(args),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data } = await sdk.full.tracks.getTrendingTrackIDs(args)
      return data ? trendingIdsFromSDK(data) : null
    }
  })
}

/**
 * Hook that returns the best rank for a track ID from trending data.
 * Returns the rank with the smallest number (best position) across all time periods.
 * @param trackId The track ID to check
 * @returns The best rank (1-based) or undefined if not found in any trending list
 */
export const useTrackRank = (trackId: ID) => {
  const { data: trendingIds } = useGetTrendingIds()

  if (!trendingIds) return undefined

  // Period priority: year > month > week (higher number = higher priority)
  const periodPriority: Record<string, number> = { Year: 3, Month: 2, Week: 1 }

  // Find all valid ranks and select the best one
  const ranks = [
    { period: 'year' as const, ids: trendingIds.year },
    { period: 'month' as const, ids: trendingIds.month },
    { period: 'week' as const, ids: trendingIds.week }
  ]
    .map(({ period, ids }) => {
      const index = ids?.findIndex((id) => id === trackId)
      return index !== -1 && index !== undefined
        ? { rank: index + 1, period: messages[period] }
        : null
    })
    .filter(removeNullable)

  if (ranks.length === 0) return undefined

  // Find best rank: smallest number first, then longest time period for ties
  const bestRank = ranks.reduce((best, current) => {
    if (current.rank < best.rank) return current
    if (current.rank === best.rank) {
      return (periodPriority[current.period] ?? 0) >
        (periodPriority[best.period] ?? 0)
        ? current
        : best
    }
    return best
  })

  return `#${bestRank.rank} this ${bestRank.period}`
}
