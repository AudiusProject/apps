import { Id } from '@audius/sdk'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'

import { userTrackMetadataFromSDK } from '~/adapters/track'
import { transformAndCleanList } from '~/adapters/utils'
import { primeTrackData, useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { makeLoadNextPage } from '../utils/infiniteQueryLoadNextPage'

export const FOR_YOU_INITIAL_PAGE_SIZE = 10
export const FOR_YOU_LOAD_MORE_PAGE_SIZE = 10

type ForYouFeedArgs = {
  initialPageSize?: number
  loadMorePageSize?: number
}

export const getForYouFeedQueryKey = (userId: ID | null | undefined) => {
  return [QUERY_KEYS.forYouFeed, userId] as unknown as QueryKey<ID[]>
}

/**
 * "For You" personalized feed. Calls the server-ranked
 * `GET /v1/users/{id}/feed/for-you` endpoint and exposes the result as
 * a paginated lineup of track ids.
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
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], allPages) => {
      const isFirstPage = allPages.length === 1
      const currentPageSize = isFirstPage ? initialPageSize : loadMorePageSize
      if (lastPage.length < currentPageSize) return undefined
      return allPages.reduce((total, page) => total + page.length, 0)
    },
    queryKey,
    queryFn: async ({ pageParam }) => {
      if (!currentUserId) return [] as ID[]
      const isFirstPage = pageParam === 0
      const currentPageSize = isFirstPage ? initialPageSize : loadMorePageSize
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.users.getUserForYouFeed({
        id: Id.parse(currentUserId),
        userId: Id.parse(currentUserId),
        limit: currentPageSize,
        offset: pageParam
      })

      const tracks = primeTrackData({
        tracks: transformAndCleanList(data, userTrackMetadataFromSDK),
        queryClient
      })

      return tracks.map(({ track_id }) => track_id)
    },
    select: (data) => data?.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && currentUserId !== null
  })

  const trackIds = query.data ?? []

  // When the query is disabled, react-query keeps isPending/isLoading true
  // (data is undefined). Surface them as false so consumers can render an
  // empty state instead of an indefinite loading state.
  const isDisabled = currentUserId === null || options?.enabled === false

  return {
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
