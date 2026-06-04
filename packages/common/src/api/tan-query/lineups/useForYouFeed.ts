import { EntityType, OptionalId } from '@audius/sdk'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'

import { transformAndCleanList, userTrackMetadataFromSDK } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { LineupData, QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { makeLoadNextPage } from '../utils/infiniteQueryLoadNextPage'
import { primeTrackData } from '../utils/primeTrackData'

export const FOR_YOU_INITIAL_PAGE_SIZE = 10
export const FOR_YOU_LOAD_MORE_PAGE_SIZE = 10

type ForYouFeedArgs = {
  initialPageSize?: number
  loadMorePageSize?: number
}

export const getForYouFeedQueryKey = (userId: ID | null | undefined) => {
  return [QUERY_KEYS.forYouFeed, userId] as unknown as QueryKey<LineupData[]>
}

/**
 * "For You" feed for the Feed page.
 *
 * NOTE: temporarily backed by the long-standing `GET /v1/tracks/recommended`
 * endpoint (`sdk.tracks.getRecommendedTracks`) — the same personalized
 * recommendation source the Explore page used before the For You feed existed.
 * The dedicated `GET /v1/users/{id}/feed/for-you` endpoint is not yet rolled
 * out across the validator-node fleet and 404s in production, so we fall back
 * to the endpoint that reliably returns 200 from `api.audius.co` today. Swap
 * back to `sdk.users.getUserForYouFeed()` once the new endpoint is deployed.
 *
 * `/tracks/recommended` has no `offset`, so pagination is done by passing the
 * already-seen track ids as `exclusionList` — each page returns fresh
 * recommendations that don't repeat earlier ones. The pageParam carries the
 * accumulated exclusion list. Returns a tracks-only lineup; consumers that
 * only render tracks can use `trackIds`.
 */
export const useForYouFeed = (
  {
    initialPageSize = FOR_YOU_INITIAL_PAGE_SIZE,
    loadMorePageSize = FOR_YOU_LOAD_MORE_PAGE_SIZE
  }: ForYouFeedArgs = {},
  options?: QueryOptions
) => {
  const { data: currentUserId } = useCurrentUserId()
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  const queryKey = getForYouFeedQueryKey(currentUserId)

  const query = useInfiniteQuery({
    initialPageParam: [] as ID[],
    getNextPageParam: (lastPage: LineupData[], allPages) => {
      const isFirstPage = allPages.length === 1
      const currentPageSize = isFirstPage ? initialPageSize : loadMorePageSize
      if (lastPage.length < currentPageSize) return undefined
      // Accumulate every track id seen so far; the next page excludes them.
      return allPages.flatMap((page) => page.map((item) => item.id))
    },
    queryKey,
    queryFn: async ({ pageParam }): Promise<LineupData[]> => {
      if (!currentUserId) return []
      const exclusionList = pageParam
      const isFirstPage = exclusionList.length === 0
      const currentPageSize = isFirstPage ? initialPageSize : loadMorePageSize
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.tracks.getRecommendedTracks({
        limit: currentPageSize,
        userId: OptionalId.parse(currentUserId),
        exclusionList: exclusionList.length ? exclusionList : undefined
      })

      const tracks = primeTrackData({
        tracks: transformAndCleanList(data, userTrackMetadataFromSDK),
        queryClient
      })

      return tracks.map(({ track_id }) => ({
        id: track_id,
        type: EntityType.TRACK
      }))
    },
    select: (data) => data?.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && currentUserId !== null
  })

  const data = query.data ?? []
  const trackIds = data
    .filter((d) => d.type === EntityType.TRACK)
    .map((d) => d.id as ID)

  // When the query is disabled, react-query keeps isPending/isLoading true
  // (data is undefined). Surface them as false so consumers can render an
  // empty state instead of an indefinite loading state.
  const isDisabled = currentUserId === null || options?.enabled === false

  return {
    data,
    trackIds,
    isPending: isDisabled ? false : query.isPending,
    isLoading: isDisabled ? false : query.isLoading,
    isFetching: query.isFetching,
    isSuccess: query.isSuccess,
    isError: query.isError,
    isInitialLoading: isDisabled ? false : query.isInitialLoading,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    loadNextPage: makeLoadNextPage(query),
    refetch: query.refetch,
    queryKey
  }
}
