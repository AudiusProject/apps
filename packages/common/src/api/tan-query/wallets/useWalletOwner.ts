import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils/QueryContext'
import { SolanaWalletAddress } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryOptions, type QueryKey } from '../types'

export const getWalletOwnerQueryKey = (
  walletAddress: SolanaWalletAddress | null | undefined
) => [QUERY_KEYS.walletOwner, walletAddress] as unknown as QueryKey<string>

export const useWalletOwner = (
  walletAddress: SolanaWalletAddress | null | undefined,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: getWalletOwnerQueryKey(walletAddress),
    queryFn: async () => {
      if (!walletAddress) return null

      try {
        const [sdk, { getAccount }, { PublicKey }] = await Promise.all([
          audiusSdk(),
          import('@solana/spl-token'),
          import('@solana/web3.js')
        ])
        const connection = await sdk.services.solanaClient.getConnection()
        const { owner } = await getAccount(
          connection,
          new PublicKey(walletAddress)
        )
        return owner?.toString() ?? walletAddress
      } catch (e) {
        console.error('Failed to get associated token account owner:', e)
        return walletAddress
      }
    },
    ...options,
    enabled: options?.enabled !== false && !!walletAddress
  })
}
