import { Id, OptionalId } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

export type UsePurchasersCountArgs = {
  contentId?: ID | null | undefined
  contentType?: string | undefined
}

export const getPurchasersCountQueryKey = ({
  contentId,
  contentType
}: UsePurchasersCountArgs) =>
  [
    QUERY_KEYS.purchasersCount,
    {
      contentId,
      contentType
    }
  ] as unknown as QueryKey<number>

export const usePurchasersCount = (
  { contentId, contentType }: UsePurchasersCountArgs = {},
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  return useQuery({
    queryKey: getPurchasersCountQueryKey({ contentId, contentType }),
    queryFn: async () => {
      const sdk = await audiusSdk()
      if (!currentUserId) return 0
      const { data = 0 } = await sdk.users.getPurchasersCount({
        id: Id.parse(currentUserId),
        userId: Id.parse(currentUserId),
        contentId: OptionalId.parse(contentId),
        contentType
      })
      return data
    },
    ...options,
    enabled: options?.enabled !== false && !!currentUserId
  })
}
