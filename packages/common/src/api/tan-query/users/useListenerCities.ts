import { Id, ListenerCity } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'

export type ListenerCitiesTime = 'week' | 'month' | 'all'

type UseListenerCitiesArgs = {
  userId: ID | null | undefined
  time: ListenerCitiesTime
  limit?: number
}

export const getListenerCitiesQueryKey = ({
  userId,
  time,
  limit
}: UseListenerCitiesArgs) =>
  [QUERY_KEYS.listenerCities, userId, { time, limit }] as unknown as QueryKey<
    ListenerCity[]
  >

/**
 * Cities whose listeners played the artist's tracks the most. Only the
 * artist or one of their managers can read this.
 */
export const useListenerCities = (
  { userId, time, limit = 10 }: UseListenerCitiesArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: getListenerCitiesQueryKey({ userId, time, limit }),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.users.getListenerCities({
        id: Id.parse(userId),
        time,
        limit
      })
      return data
    },
    ...options,
    enabled: options?.enabled !== false && !!userId
  })
}
