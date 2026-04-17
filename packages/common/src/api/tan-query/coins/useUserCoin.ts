import { UserCoinWithAccounts } from '@audius/sdk'
import type { AudiusSdkWithServices } from '@audius/sdk'
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import { AnyAction, Dispatch } from 'redux'

import { ID } from '~/models'

import { getUserCoinBatcher } from '../batchers/getUserCoinBatcher'
import { SelectableQueryOptions } from '../types'
import { useCurrentAccountUser } from '../users/account/accountSelectors'
import { useQueryContext } from '../utils'

import { getUserCoinQueryKey } from './userCoinQueryKey'

export { getUserCoinQueryKey } from './userCoinQueryKey'

export interface UseUserCoinParams {
  mint: string
  userId?: ID | null
}

export type UseUserCoinOptions<TResult> = SelectableQueryOptions<
  UserCoinWithAccounts | null,
  TResult
>

export const getUserCoinQueryFn = async (
  mint: string,
  userId: ID,
  queryClient: QueryClient,
  sdk: AudiusSdkWithServices,
  dispatch: Dispatch<AnyAction>
) => {
  const batchGetUserCoin = getUserCoinBatcher({
    sdk,
    currentUserId: null,
    queryClient,
    dispatch
  })
  return batchGetUserCoin.fetch({ userId, mint })
}

export const useUserCoin = <TResult = UserCoinWithAccounts | null>(
  params: UseUserCoinParams,
  options?: UseUserCoinOptions<TResult>
) => {
  const { audiusSdk, env } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { data: currentUser } = useCurrentAccountUser({
    enabled: !params.userId
  })
  const userId = params.userId ?? currentUser?.user_id ?? null

  return useQuery({
    queryKey: getUserCoinQueryKey(params.mint, userId),
    queryFn: async () => {
      const sdk = await audiusSdk()
      return getUserCoinQueryFn(
        params.mint,
        userId!,
        queryClient,
        sdk,
        dispatch
      )
    },
    ...options,
    enabled:
      options?.enabled !== false &&
      !!params.mint &&
      !!userId &&
      params.mint !== env.USDC_MINT_ADDRESS
  })
}
