import { useMutation } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils/QueryContext'
import { WalletClient } from '~/services/wallet-client'

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
