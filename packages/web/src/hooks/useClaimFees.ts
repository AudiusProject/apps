import {
  getArtistCoinQueryKey,
  useCurrentAccountUser,
  useQueryContext,
  pollUntilAudioBalanceChanges
} from '@audius/common/api'
import { Feature } from '@audius/common/models'
import { createUserBankIfNeeded } from '@audius/common/services'
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
  externalWalletAddress: string
}

export type ClaimFeesResponse = {
  signatures: string[]
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
  const { data: currentUser } = useCurrentAccountUser()

  return useMutation<ClaimFeesResponse, Error, UseClaimFeesParams>({
    mutationFn: async ({
      tokenMint,
      externalWalletAddress
    }: UseClaimFeesParams): Promise<ClaimFeesResponse> => {
      const sdk = await audiusSdk()
      const solanaProvider = appkitModal.getProvider<SolanaProvider>('solana')
      if (!solanaProvider) {
        throw new Error('Missing SolanaProvider')
      }
      if (!externalWalletAddress) {
        throw new Error('Missing external wallet')
      }
      if (!currentUser?.erc_wallet) {
        throw new Error('Missing current user erc_wallet')
      }
      const userBank = await createUserBankIfNeeded(sdk, {
        recordAnalytics: track,
        mint: 'wAUDIO',
        ethAddress: currentUser?.erc_wallet
      })
      if (!userBank) {
        throw new Error('Unable to get or create wAUDIO SPL wallet address')
      }
      // Get the claim fee transaction from the relay
      const claimFeesResponse = await sdk.services.solanaRelay.claimFees({
        tokenMint,
        ownerWalletAddress: externalWalletAddress,
        receiverWalletAddress: userBank.toString()
      })

      const { claimFeeTxs: serializedTxs } = claimFeesResponse

      // Transaction is sent from the backend as a serialized base64 string
      const claimFeesTxs = serializedTxs.map((tx: string) =>
        VersionedTransaction.deserialize(Buffer.from(tx, 'base64'))
      )

      // Triggers 3rd party wallet to sign and send the transaction
      const allTransactions =
        await solanaProvider.signAllTransactions(claimFeesTxs)

      // Confirm all of the transactions
      const signatures = await Promise.all(
        allTransactions.map((tx) =>
          sdk.services.solanaClient.sendTransaction(tx)
        )
      )

      return {
        signatures
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
    onSuccess: async (data, variables, context) => {
      // Invalidate the artist coin query to refetch the updated fees
      const queryKey = getArtistCoinQueryKey(variables.tokenMint)
      await queryClient.invalidateQueries({ queryKey })

      // Call the original onSuccess if provided
      options?.onSuccess?.(data, variables, context)

      // Poll audio balance queries until the balance actually changes
      // The reason we want to do polling logic here is we dont actually have the value
      if (currentUser?.spl_wallet) {
        await pollUntilAudioBalanceChanges(queryClient, currentUser.spl_wallet)
      }
    }
  })
}
