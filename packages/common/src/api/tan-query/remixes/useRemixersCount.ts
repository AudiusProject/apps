import { Id, OptionalId } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

export type UseRemixersCountArgs = {
  trackId?: ID | null | undefined
}

export const getRemixersCountQueryKey = ({ trackId }: UseRemixersCountArgs) =>
  [QUERY_KEYS.remixersCount, trackId] as unknown as QueryKey<number>

export const useRemixersCount = (
  { trackId }: UseRemixersCountArgs = {},
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  return useQuery({
    queryKey: getRemixersCountQueryKey({ trackId }),
    queryFn: async () => {
      const sdk = await audiusSdk()
      if (!currentUserId) return 0
      const { data = 0 } = await sdk.users.getRemixersCount({
        id: Id.parse(currentUserId),
        userId: Id.parse(currentUserId),
        trackId: OptionalId.parse(trackId)
      })
      return data
    },
    ...options,
    enabled: options?.enabled !== false && !!currentUserId
  })
}
