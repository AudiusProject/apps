import { AudiusSdk } from '@audius/sdk'
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { omit } from 'lodash'

import { accountFromSDK } from '~/adapters/user'
import { primeUserData, useQueryContext } from '~/api/tan-query/utils'
import { AccountUserMetadata, User, UserMetadata } from '~/models'

import { QUERY_KEYS } from '../../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../../types'
import { useUser } from '../useUser'

import { useWalletAddresses } from './useWalletAddresses'

type NormalizedAccountUserMetadata = Omit<AccountUserMetadata, 'user'> & {
  userId: number | undefined
}

export const getWalletAccountQueryKey = (wallet: string | null | undefined) =>
  [
    QUERY_KEYS.account,
    QUERY_KEYS.walletAccount,
    wallet
  ] as unknown as QueryKey<NormalizedAccountUserMetadata | null>

// This queryFn is separate in order to be used in sagas
export const getWalletAccountQueryFn = async (
  wallet: string,
  sdk: AudiusSdk,
  queryClient: QueryClient
) => {
  const { data } = await sdk.full.users.getUserAccount({
    wallet
  })

  if (!data) {
    console.warn('Missing user from account response')
    return null
  }

  const accountData = accountFromSDK(data)
  if (accountData?.user) {
    primeUserData({ users: [omit(accountData.user, 'playlists')], queryClient })
  }
  return accountData
}

/**
 * Hook to get the currently logged in user's data
 */
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

// Some helper selectors - these pull the current wallet addresses out of redux for you
// NOTE: web3User means the user that signed in originally (i.e. could be a manager)
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
