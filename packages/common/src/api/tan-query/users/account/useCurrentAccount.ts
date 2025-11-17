import { AudiusSdk } from '@audius/sdk'
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'

import { accountFromSDK } from '~/adapters/user'
import { primeUserData, useQueryContext } from '~/api/tan-query/utils'
import { useAppContext } from '~/context/appContext'
import { Status } from '~/models'
import { UserMetadata } from '~/models/User'
import { LocalStorage } from '~/services'
import { AccountState } from '~/store'

import { QUERY_KEYS } from '../../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../../types'
import { getUserQueryKey } from '../useUser'

import { getAccountStatusQueryKey } from './useAccountStatus'
import { useWalletAddresses } from './useWalletAddresses'

export const getCurrentAccountQueryKey = () =>
  [
    QUERY_KEYS.account,
    QUERY_KEYS.accountUser
  ] as unknown as QueryKey<AccountState>

const getLocalAccount = (
  localStorage: LocalStorage,
  queryClient: QueryClient
) => {
  const localAccount = localStorage.getAudiusAccountSync?.()
  const localAccountUser =
    localStorage.getAudiusAccountUserSync?.() as UserMetadata
  if (localAccount && localAccountUser) {
    if (
      localAccountUser &&
      !queryClient.getQueryData(getUserQueryKey(localAccountUser.user_id))
    ) {
      primeUserData({ users: [localAccountUser], queryClient })
    }
    // feature-tan-query TODO: when removing account sagas,
    //    need to add wallets and local account user from local storage
    return {
      collections: localAccount.collections,
      userId: localAccountUser.user_id,
      hasTracks: localAccountUser.track_count > 0,
      status: Status.SUCCESS,
      reason: null,
      connectivityFailure: false,
      needsAccountRecovery: false,
      walletAddresses: { currentUser: null, web3User: null },
      playlistLibrary: localAccount.playlistLibrary ?? null,
      trackSaveCount: localAccount.trackSaveCount,
      guestEmail: localAccount.guestEmail
    } as AccountState
  }
  return null
}

export const getCurrentAccountQueryFn = async (
  sdk: AudiusSdk,
  localStorage: LocalStorage,
  currentUserWallet: string | null,
  queryClient: QueryClient
): Promise<AccountState | null | undefined> => {
  const localAccount = getLocalAccount(localStorage, queryClient)
  if (localAccount) {
    return localAccount
  }

  if (!currentUserWallet) {
    return null
  }

  const { data } = await sdk.full.users.getUserAccount({
    wallet: currentUserWallet!
  })

  if (!data) {
    console.warn('Missing user from account response')
    return null
  }

  const account = accountFromSDK(data)
  if (account) {
    queryClient.setQueryData(getAccountStatusQueryKey(), Status.SUCCESS)
    primeUserData({ users: [account.user], queryClient })
  } else {
    queryClient.setQueryData(getAccountStatusQueryKey(), Status.ERROR)
  }

  return {
    collections: account?.playlists,
    userId: account?.user?.user_id,
    hasTracks: (account?.user?.track_count ?? 0) > 0,
    status: account ? Status.SUCCESS : Status.ERROR,
    reason: null,
    connectivityFailure: false,
    needsAccountRecovery: false,
    walletAddresses: { currentUser: null, web3User: null },
    playlistLibrary: account?.playlist_library ?? null,
    trackSaveCount: account?.track_save_count ?? null,
    guestEmail: null
  } as AccountState
}

/**
 * Hook to get the currently logged in user's account
 */
export const useCurrentAccount = <TResult = AccountState | null | undefined>(
  options?: SelectableQueryOptions<AccountState | null | undefined, TResult>
) => {
  const { audiusSdk } = useQueryContext()
  const { data: walletAddresses } = useWalletAddresses()
  const currentUserWallet = walletAddresses?.currentUser
  const { localStorage } = useAppContext()
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: getCurrentAccountQueryKey(),
    queryFn: async () =>
      getCurrentAccountQueryFn(
        await audiusSdk(),
        localStorage,
        currentUserWallet!,
        queryClient
      ),
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: options?.enabled !== false && !!currentUserWallet,
    ...options
  })
}
