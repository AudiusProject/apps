import { getAssociatedTokenAddressSync, getAccount } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'

import { QUERY_KEYS } from '~/api/tan-query/queryKeys'
import { QueryKey } from '~/api/tan-query/types'
import { useQueryContext } from '~/api/tan-query/utils'
import { buyUSDCActions } from '~/store/buy-usdc'
import { buyAudioActions } from '~/store/ui'

export const getMintRecoveryQueryKey = (mint: string, walletAddress: string) =>
  [QUERY_KEYS.mintRecovery, mint, walletAddress] as unknown as QueryKey<bigint>

export const useMintRecovery = (mint: string) => {
  const { audiusSdk, dispatch, env, solanaWalletService } = useQueryContext()

  return useQuery({
    queryKey: getMintRecoveryQueryKey(mint, 'root-wallet'),
    queryFn: async () => {
      const sdk = await audiusSdk()

      // For recovery, we always check the root wallet balance
      // This hook will be used to detect tokens left in root wallet that need recovery
      const rootWalletAddress = await solanaWalletService.getKeypair()
      if (!rootWalletAddress) {
        return BigInt(0)
      }

      try {
        // Get the ATA for the root wallet + mint
        const ata = getAssociatedTokenAddressSync(
          new PublicKey(mint),
          rootWalletAddress.publicKey
        )

        // Get the token account info
        const accountInfo = await getAccount(
          sdk.services.solanaClient.connection,
          ata
        )

        return accountInfo.amount
      } catch (error) {
        // If ATA doesn't exist or has no balance, return 0
        return BigInt(0)
      }
    },
    enabled: !!mint,
    refetchInterval: 2000, // Poll every 5 seconds
    refetchOnWindowFocus: true,
    select: (balance: bigint) => {
      // If there's a balance, trigger recovery
      if (balance > BigInt(0)) {
        const isUsdc = mint === env.USDC_MINT_ADDRESS
        const isAudio = mint === env.WAUDIO_MINT_ADDRESS

        if (isUsdc) {
          dispatch(buyUSDCActions.startRecoveryIfNecessary())
        } else if (isAudio) {
          dispatch(buyAudioActions.startRecoveryIfNecessary())
        }
      }

      return balance
    }
  })
}
