import { encodeHashId, OptionalId } from '@audius/sdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { userMetadataListFromSDK } from '~/adapters/user'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useUsers } from '../users/useUsers'
import { primeUserData } from '../utils/primeUserData'

const DEFAULT_LIMIT = 12

type UseEventFollowersArgs = {
  eventId: ID | null | undefined
  limit?: number
}

export const getEventFollowersQueryKey = ({
  eventId,
  limit
}: UseEventFollowersArgs) =>
  [QUERY_KEYS.eventFollowers, eventId, { limit }] as unknown as QueryKey<ID[]>

/**
 * Hook returning the user IDs subscribed to a remix-contest event — feeds
 * the "Followers (N)" avatar stack on the contest page.
 *
 * Backed by `GET /v1/events/:eventId/followers` via the generated SDK.
 */
export const useEventFollowers = (
  { eventId, limit = DEFAULT_LIMIT }: UseEventFollowersArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  const queryRes = useQuery({
    queryKey: getEventFollowersQueryKey({ eventId, limit }),
    queryFn: async (): Promise<ID[]> => {
      if (!eventId) return []
      try {
        const sdk = await audiusSdk()
        const { data = [] } = await sdk.events.getEventFollowers({
          eventId: encodeHashId(eventId)!,
          limit,
          offset: 0,
          userId: OptionalId.parse(currentUserId ?? undefined)
        })
        const users = userMetadataListFromSDK(data)
        if (users.length) primeUserData({ users, queryClient })
        return users.map((u) => u.user_id)
      } catch (error) {
        console.error('Events', error as Error)
        return []
      }
    },
    ...options,
    enabled: !!eventId && (options?.enabled ?? true)
  })

  const { data: users } = useUsers(queryRes.data)

  return {
    users,
    userIds: queryRes.data,
    isPending: queryRes.isPending
  }
}
