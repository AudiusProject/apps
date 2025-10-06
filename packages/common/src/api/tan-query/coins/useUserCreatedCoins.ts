import { Id } from '@audius/sdk'
import {
  queryOptions,
  useQuery,
  type QueryFunctionContext
} from '@tanstack/react-query'

import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { useQueryContext, type QueryContextType } from '../utils'

export type UseUserCreatedCoinsParams = {
  userId: ID | null | undefined
  limit?: number
  offset?: number
}

export const getUserCreatedCoinsQueryKey = (
  userId?: ID | null,
  limit?: number,
  offset?: number
) => [QUERY_KEYS.userCreatedCoins, userId, { limit, offset }] as const

/**
 * Query function for fetching coins owned by a user
 */
const getUserCreatedCoinsQueryFn =
  (context: Pick<QueryContextType, 'audiusSdk'>) =>
  async ({
    queryKey
  }: QueryFunctionContext<ReturnType<typeof getUserCreatedCoinsQueryKey>>) => {
    const [_ignored, userId, { limit, offset }] = queryKey
    const sdk = await context.audiusSdk()

    const response = await sdk.coins.getCoins({
      ownerId: [Id.parse(userId)],
      limit,
      offset
    })

    return response.data ?? []
  }

/**
 * Helper function to get the query options for fetching coins owned by a user.
 * Useful for getting the query key tagged with the data type stored in the cache.
 */
const getUserCreatedCoinsOptions = (
  context: Pick<QueryContextType, 'audiusSdk'>,
  { userId, limit = 5, offset = 0 }: UseUserCreatedCoinsParams
) => {
  return queryOptions({
    queryKey: getUserCreatedCoinsQueryKey(userId, limit, offset),
    queryFn: getUserCreatedCoinsQueryFn(context),
    enabled: !!userId
  })
}

/**
 * Returns a list of coins the user has launched
 * @param userId
 * @param options
 * @returns
 */
export const useUserCreatedCoins = (
  params: UseUserCreatedCoinsParams,
  options?: Partial<ReturnType<typeof getUserCreatedCoinsOptions>>
) => {
  const context = useQueryContext()

  return useQuery({
    ...options,
    ...getUserCreatedCoinsOptions(context, params),
    enabled: options?.enabled !== false && !!params.userId
  })
}
