import { encodeHashId } from '@audius/sdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { userMetadataListFromSDK } from '~/adapters/user'
import { useQueryContext } from '~/api/tan-query/utils'
import { Feature, ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
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
 * Hook returning the user IDs subscribed to a remix-contest event — feeds the
 * "Followers (N)" avatar stack on the contest page.
 *
 * Uses a raw fetch against `/v1/events/:eventId/followers` on the api host;
 * the endpoint exists in the Go api but isn't in the OpenAPI spec / SDK yet,
 * so we can't go through `sdk.events.*` here.
 */
export const useEventFollowers = (
  { eventId, limit = DEFAULT_LIMIT }: UseEventFollowersArgs,
  options?: QueryOptions
) => {
  const { env, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()

  const queryRes = useQuery({
    queryKey: getEventFollowersQueryKey({ eventId, limit }),
    enabled: options?.enabled !== false && !!eventId,
    queryFn: async (): Promise<ID[]> => {
      if (!eventId) return []
      try {
        const url = `${env.API_URL.replace(/\/$/, '')}/v1/events/${encodeHashId(eventId)}/followers?limit=${limit}&offset=0`
        const res = await fetch(url)
        if (!res.ok) return []
        const json = (await res.json()) as { data?: unknown[] }
        const users = userMetadataListFromSDK(json.data ?? [])
        if (users.length) primeUserData({ users, queryClient })
        return users.map((u) => u.user_id)
      } catch (error) {
        reportToSentry({
          error: error as Error,
          name: 'Events',
          feature: Feature.Events
        })
        return []
      }
    },
    ...options
  })

  const { data: users } = useUsers(queryRes.data)

  return {
    users,
    userIds: queryRes.data,
    isPending: queryRes.isPending
  }
}
