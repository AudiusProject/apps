import { OptionalId } from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'

import { transformAndCleanList, userMetadataFromSDK } from '~/adapters'
import { ID } from '~/models/Identifiers'
import { SearchKind } from '~/store/pages/search-results/types'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useUsers } from '../users/useUsers'
import { useQueryContext } from '../utils/QueryContext'
import { primeUserData } from '../utils/primeUserData'

const DEFAULT_LIMIT = 15

type UseSearchUsersModalArgs = {
  query: string
  limit?: number
}

export const getSearchUsersModalQueryKey = ({
  query,
  limit = DEFAULT_LIMIT
}: UseSearchUsersModalArgs) =>
  [QUERY_KEYS.searchUsersModal, query, { limit }] as unknown as QueryKey<
    InfiniteData<ID[]>
  >

/**
 * Paginated user search backed by `sdk.search.search` with `kind: USERS`.
 *
 * Replaces the legacy `searchUsersModal` redux slice + `searchUsersModalSagas`
 * pair. Each query value gets its own infinite query key, so callers don't
 * need to manually clear state when the query changes — the previous query's
 * results stay in cache and the new query starts fresh.
 */
export const useSearchUsersModal = (
  { query, limit = DEFAULT_LIMIT }: UseSearchUsersModalArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  const queryRes = useInfiniteQuery({
    queryKey: getSearchUsersModalQueryKey({ query, limit }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], allPages) => {
      if (lastPage.length < limit) return undefined
      return allPages.length * limit
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const { data } = await sdk.search.search({
        query,
        limit,
        kind: SearchKind.USERS,
        offset: pageParam,
        userId: OptionalId.parse(currentUserId)
      })
      const users = transformAndCleanList(
        data?.users ?? [],
        userMetadataFromSDK
      )
      primeUserData({ users, queryClient })
      return users.map((user) => user.user_id)
    },
    select: (data) => data.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && query.length > 0
  })

  const { data: users } = useUsers(queryRes.data)

  return {
    users,
    userIds: queryRes.data ?? [],
    data: queryRes.data,
    isPending: queryRes.isPending,
    isLoading: queryRes.isLoading,
    isSuccess: queryRes.isSuccess,
    isError: queryRes.isError,
    hasNextPage: queryRes.hasNextPage,
    isFetchingNextPage: queryRes.isFetchingNextPage,
    fetchNextPage: queryRes.fetchNextPage
  }
}
