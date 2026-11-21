import { AudiusSdk } from '@audius/sdk'
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { omit } from 'lodash'
import { call } from 'typed-redux-saga'

import { accountFromSDK } from '~/adapters/user'
import { primeUserData, useQueryContext } from '~/api/tan-query/utils'
import { AccountUserMetadata, User } from '~/models'

import { QUERY_KEYS } from '../../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../../types'
import { useUser } from '../useUser'

import { useWalletAddresses } from './useWalletAddresses'

export type NormalizedAccountUserMetadata = Omit<
  AccountUserMetadata,
  'user'
> & {
  userId: number | undefined
}

export const getWalletAccountQueryKey = (wallet: string | null | undefined) =>
  [
    QUERY_KEYS.account,
    QUERY_KEYS.walletAccount,
    wallet
  ] as unknown as QueryKey<NormalizedAccountUserMetadata | null>

export const getWalletAccountQueryFn = async (
  wallet: string,
  sdk: AudiusSdk,
  queryClient: QueryClient
) => {
  try {
    const { data } = await sdk.users.getUserAccount({ wallet })

    if (!data) {
      console.warn('Missing user from account response')
      return null
    }

    const accountData = accountFromSDK(data)
    if (accountData?.user) {
      primeUserData({
        users: [omit(accountData.user, 'playlists')],
        queryClient
      })
    }
    return accountData
  } catch (err) {
    console.warn(
      'Failed to fetch user account (may be incomplete signup):',
      err
    )
    return null
  }
}

export function* getWalletAccountSaga(
  wallet: string,
  sdk: AudiusSdk,
  queryClient: QueryClient
) {
  const accountData = yield* call(
    getWalletAccountQueryFn,
    wallet,
    sdk,
    queryClient
  )
  if (!accountData) {
    return null
  }
  const normalizedAccountData = {
    ...omit(accountData, ['user']),
    userId: accountData?.user?.user_id
  } as NormalizedAccountUserMetadata
  queryClient.setQueryData(
    getWalletAccountQueryKey(wallet),
    normalizedAccountData
  )
  return accountData
}

export const useWalletAccount = <
  TResult = NormalizedAccountUserMetadata | null | undefined
>(
  wallet: string | null | undefined,
  options?: SelectableQueryOptions<
    NormalizedAccountUserMetadata | null | undefined,
    TResult
  >
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: getWalletAccountQueryKey(wallet),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const accountData = await getWalletAccountQueryFn(
        wallet!,
        sdk,
        queryClient
      )
      return {
        ...omit(accountData, ['user']),
        userId: accountData?.user?.user_id
      }
    },
    ...options,
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: options?.enabled !== false && !!wallet
  })
}

export const useCurrentWeb3Account = <TResult = User>(
  options?: SelectableQueryOptions<User, TResult>
) => {
  const { data: walletAddresses } = useWalletAddresses()
  const { web3User } = walletAddresses ?? {}

  const { data: userId } = useWalletAccount(web3User, {
    select: (data) => data?.userId
  })
  return useUser<TResult>(userId, options)
}
