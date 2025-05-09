import { Id, OptionalId } from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { userMetadataListFromSDK } from '~/adapters/user'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeUserData } from '../utils/primeUserData'

const DEFAULT_PAGE_SIZE = 20

type UseFavoritesArgs = {
  trackId: ID | null | undefined
  pageSize?: number
}

export const getTrackFavoritesQueryKey = (args: UseFavoritesArgs) => {
  const { trackId, pageSize = DEFAULT_PAGE_SIZE } = args
  return [
    QUERY_KEYS.favorites,
    trackId,
    {
      pageSize
    }
  ] as unknown as QueryKey<InfiniteData<ID[]>>
}

export const useTrackFavorites = (
  { trackId, pageSize = DEFAULT_PAGE_SIZE }: UseFavoritesArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  return useInfiniteQuery({
    queryKey: getTrackFavoritesQueryKey({ trackId, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const { data } = await sdk.full.tracks.getUsersFromFavorites({
        trackId: Id.parse(trackId),
        limit: pageSize,
        offset: pageParam,
        userId: OptionalId.parse(currentUserId)
      })
      const users = userMetadataListFromSDK(data)
      primeUserData({ users, queryClient, dispatch })
      return users.map((user) => user.user_id)
    },
    select: (data) => data.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && !!trackId
  })
}
