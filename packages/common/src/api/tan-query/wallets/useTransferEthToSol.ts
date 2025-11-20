import { useMutation } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils/QueryContext'
import { WalletClient } from '~/services/wallet-client'

/**
 * Mutation hook for converting ETH AUDIO to Solana wAUDIO via Wormhole.
 * Platform covers all fees.
 */
export const useTransferEthToSol = () => {
  const { audiusBackend, audiusSdk, env } = useQueryContext()

  return useMutation({
    mutationFn: async ({ ethAddress }: { ethAddress: string }) => {
      const walletClient = new WalletClient({
        audiusBackendInstance: audiusBackend,
        audiusSdk,
        env
      })
      return await walletClient.transferTokensFromEthToSol({ ethAddress })
    }
  })
}
