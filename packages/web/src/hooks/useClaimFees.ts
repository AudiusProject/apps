import { type Coin } from '@audius/common/adapters'
import {
  getArtistCoinQueryKey,
  useQueryContext,
  QUERY_KEYS
} from '@audius/common/api'
import { Feature } from '@audius/common/models'
import { createUserBankIfNeeded } from '@audius/common/services'
import { solana } from '@reown/appkit/networks'
import type { Provider as SolanaProvider } from '@reown/appkit-adapter-solana/react'
import { VersionedTransaction } from '@solana/web3.js'
import {
  useMutation,
  UseMutationOptions,
  useQueryClient
} from '@tanstack/react-query'

import { appkitModal } from 'app/ReownAppKitModal'
import { track } from 'services/analytics'
import { reportToSentry } from 'store/errors/reportToSentry'

export type UseClaimFeesParams = {
  tokenMint: string
  ownerWalletAddress: string
  ownerEthAddress: string
}

export type ClaimFeesResponse = {
  claimFeesTx: string
  signature: string
}

/**
 * Hook for claiming creator trading fees from a dynamic bonding curve pool.
 * This gets the TX from solana relay, then signs and sends the claim fees transaction.
 * NOTE: This is a web feature only because the user must sign with the same external wallet they used to launch the coin (wallet connect wallet).
 */
export const useClaimFees = (
  options?: UseMutationOptions<ClaimFeesResponse, Error, UseClaimFeesParams>
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  return useMutation<ClaimFeesResponse, Error, UseClaimFeesParams>({
    mutationFn: async ({
      tokenMint,
      ownerWalletAddress,
      ownerEthAddress
    }: UseClaimFeesParams): Promise<ClaimFeesResponse> => {
      const sdk = await audiusSdk()
      await appkitModal.switchNetwork(solana)
      const solanaProvider = appkitModal.getProvider<SolanaProvider>('solana')
      if (!solanaProvider) {
        throw new Error('Missing SolanaProvider')
      }
      if (!ownerWalletAddress) {
        throw new Error('Missing owner wallet address')
      }
      if (!ownerEthAddress) {
        throw new Error('Missing owner ETH address')
      }
      const userBank = await createUserBankIfNeeded(sdk, {
        recordAnalytics: track,
        mint: 'wAUDIO',
        ethAddress: ownerEthAddress
      })

      // Get the claim fee transaction from the relay
      const claimFeesResponse = await sdk.services.solanaRelay.claimFees({
        tokenMint,
        ownerWalletAddress,
        receiverWalletAddress: userBank.toString()
      })

      const { claimFeesTx: claimFeesTxSerialized } = claimFeesResponse

      // Transaction is sent from the backend as a serialized base64 string
      const deserializedTx = VersionedTransaction.deserialize(
        Buffer.from(claimFeesTxSerialized, 'base64')
      )

      // Triggers 3rd party wallet to sign and send the transaction
      const signature =
        await solanaProvider.signAndSendTransaction(deserializedTx)

      // Confirm the transaction
      await sdk.services.solanaClient.connection.confirmTransaction(
        signature,
        'confirmed'
      )

      return {
        claimFeesTx: claimFeesTxSerialized,
        signature
      }
    },
    ...options,
    onError: (error, params) => {
      // Call the original onError if provided
      reportToSentry({
        error,
        feature: Feature.ArtistCoins,
        name: 'Artist coin fees claim error',
        additionalInfo: {
          ...params
        }
      })
    },
    onSuccess: (data, variables, context) => {
      // Optimistically update the unclaimed fees data
      const queryKey = getArtistCoinQueryKey(variables.tokenMint)
      queryClient.setQueryData<Coin>(queryKey, (existingCoin) => {
        if (!existingCoin) return existingCoin
        return {
          ...existingCoin,
          dynamicBondingCurve: {
            ...existingCoin?.dynamicBondingCurve,
            creatorQuoteFee: 0
          }
        }
      })

      // Invalidate audio balance queries to refresh user's AUDIO balance
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.audioBalance]
      })

      // Call the original onSuccess if provided
      options?.onSuccess?.(data, variables, context)
    }
  })
}
