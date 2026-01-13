import { Id, UserCoinWithAccounts } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../types'
import { useCurrentAccountUser } from '../users/account/accountSelectors'
import { useQueryContext } from '../utils'

export interface UseUserCoinParams {
  mint: string
  userId?: ID | null
}

export const getUserCoinQueryKey = (mint: string, userId?: ID | null) =>
  [
    QUERY_KEYS.userCoin,
    userId,
    mint
  ] as unknown as QueryKey<UserCoinWithAccounts | null>

export type UseUserCoinOptions<TResult> = SelectableQueryOptions<
  UserCoinWithAccounts | null,
  TResult
>

export const useUserCoin = <TResult = UserCoinWithAccounts | null>(
  params: UseUserCoinParams,
  options?: UseUserCoinOptions<TResult>
) => {
  const { audiusSdk, env } = useQueryContext()
  // Default to current user if no userId is provided
  const { data: currentUser } = useCurrentAccountUser({
    enabled: !params.userId
  })
  const userId = params.userId ?? currentUser?.user_id ?? null

  return useQuery({
    queryKey: getUserCoinQueryKey(params.mint, userId),
    queryFn: async () => {
      const sdk = await audiusSdk()

      const response = await sdk.users.getUserCoin({
        id: Id.parse(userId),
        mint: params.mint
      })

      return response.data ?? null
    },
    ...options,
    enabled:
      options?.enabled !== false &&
      !!params.mint &&
      !!userId &&
      params.mint !== env.USDC_MINT_ADDRESS
  })
}
