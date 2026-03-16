import { Id, OptionalId } from '@audius/sdk/services'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'

import { userMetadataListFromSDK } from '~/adapters/user'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeUserData } from '../utils/primeUserData'

const DEFAULT_PAGE_SIZE = 20

export type UseRemixersArgs = {
  userId: ID | null | undefined
  trackId?: ID | null | undefined
  pageSize?: number
}

export const getRemixersQueryKey = ({
  userId,
  trackId,
  pageSize = DEFAULT_PAGE_SIZE
}: UseRemixersArgs) =>
  [QUERY_KEYS.remixers, userId, trackId, { pageSize }] as unknown as QueryKey<
    InfiniteData<ID[]>
  >

export const useRemixers = (
  { userId, trackId, pageSize = DEFAULT_PAGE_SIZE }: UseRemixersArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  return useInfiniteQuery({
    queryKey: getRemixersQueryKey({ userId, trackId, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.users.getRemixers({
        id: Id.parse(userId),
        limit: pageSize,
        offset: pageParam,
        userId: OptionalId.parse(currentUserId),
        trackId: OptionalId.parse(trackId)
      })
      const users = userMetadataListFromSDK(data)
      primeUserData({ users, queryClient })
      return users.map((user) => user.user_id)
    },
    select: (data) => data.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && !!userId
  })
}
