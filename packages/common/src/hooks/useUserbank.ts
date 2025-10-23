import { useQuery } from '@tanstack/react-query'

import { useWalletAddresses } from '~/api'
import { QUERY_KEYS } from '~/api/tan-query/queryKeys'
import { QueryKey, SelectableQueryOptions } from '~/api/tan-query/types'
import { useQueryContext } from '~/api/tan-query/utils'
import { createUserBankIfNeeded } from '~/services/audius-backend'

import { useAnalytics } from './useAnalytics'

export const getUserbankQueryKey = (mint: string | undefined) =>
  [QUERY_KEYS.userbank, mint] as unknown as QueryKey<string | null>

export const useUserbank = (
  mint: string | undefined,
  options?: SelectableQueryOptions<string | null, string | null>
) => {
  const { data: walletAddresses } = useWalletAddresses()
  const { currentUser: wallet } = walletAddresses ?? {}
  const { audiusSdk } = useQueryContext()
  const { track } = useAnalytics()

  const {
    data: userBankAddress,
    isLoading,
    error
  } = useQuery({
    queryKey: getUserbankQueryKey(mint),
    queryFn: async () => {
      if (!wallet || !mint) return null
      const sdk = await audiusSdk()
      const accountInfo = await createUserBankIfNeeded(sdk, {
        ethAddress: wallet,
        mint: mint as any,
        recordAnalytics: track
      })
      return accountInfo.toString()
    },
    enabled: options?.enabled !== false && !!mint && !!wallet,
    ...options
  })

  return {
    userBankAddress,
    loading: isLoading,
    error,
    wallet
  }
}
