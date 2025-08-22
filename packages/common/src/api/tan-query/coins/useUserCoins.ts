import { useMemo } from 'react'

import { HashId, Id, UserCoin as UserCoinSdk } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { SelectableQueryOptions } from '../types'
import { useQueryContext } from '../utils'

export interface UseUserCoinsParams {
  userId: ID | undefined | null
  limit?: number
  offset?: number
}

export type UserCoin = Omit<UserCoinSdk, 'ownerId'> & {
  ownerId: ID
}

export const useUserCoins = <TResult = UserCoin[]>(
  params: UseUserCoinsParams,
  options?: SelectableQueryOptions<UserCoin[], TResult>
) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: [QUERY_KEYS.userCoins, params],
    queryFn: async () => {
      const sdk = await audiusSdk()
      const response = await sdk.users.getUserCoins({
        id: Id.parse(params.userId),
        limit: params.limit,
        offset: params.offset
      })
      if (response.data) {
        return response.data.map((coinFromSDK) => ({
          ...coinFromSDK,
          ownerId: HashId.parse(coinFromSDK.ownerId)
        })) as UserCoin[]
      }
      return []
    },
    ...options,
    enabled: !!params.userId && options?.enabled !== false
  })
}
