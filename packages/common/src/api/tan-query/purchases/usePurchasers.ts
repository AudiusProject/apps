import { Id, OptionalId } from '@audius/sdk/services'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'

import { userMetadataListFromSDK } from '~/adapters/user'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'
import { PurchaseableContentType } from '~/store'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeUserData } from '../utils/primeUserData'

const PAGE_SIZE = 20

export type UsePurchasersArgs = {
  contentId?: ID | undefined
  contentType?: PurchaseableContentType | undefined
  pageSize?: number
}

export const getPurchasersQueryKey = ({
  contentId,
  contentType,
  pageSize
}: UsePurchasersArgs) =>
  [
    QUERY_KEYS.purchasers,
    {
      contentId,
      contentType,
      pageSize
    }
  ] as unknown as QueryKey<InfiniteData<ID[]>>

export const usePurchasers = (
  args: UsePurchasersArgs,
  options?: QueryOptions
) => {
  const { contentId, contentType, pageSize = PAGE_SIZE } = args
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  return useInfiniteQuery({
    queryKey: getPurchasersQueryKey(args),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      if (!currentUserId) return []
      const { data = [] } = await sdk.users.getPurchasers({
        id: Id.parse(currentUserId),
        limit: pageSize,
        offset: pageParam,
        userId: Id.parse(currentUserId),
        contentId: OptionalId.parse(contentId),
        contentType
      })
      const users = userMetadataListFromSDK(data)
      primeUserData({ users, queryClient })
      return users.map((user) => user.user_id)
    },
    select: (data) => data.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && !!currentUserId
  })
}
