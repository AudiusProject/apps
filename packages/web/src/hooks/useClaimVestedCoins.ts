import { type Coin } from '@audius/common/adapters'
import {
  getArtistCoinQueryKey,
  useCurrentAccountUser,
  useQueryContext,
  QUERY_KEYS
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

export type UseClaimVestedCoinsParams = {
  tokenMint: string
  externalWalletAddress: string
}

export type ClaimVestedCoinsResponse = {
  signatures: string[]
}

/**
 * Hook for claiming vested/unlocked artist coins from the vesting schedule.
 * After an artist coin graduates, the artist's reserved coins unlock daily over a 5-year period.
 * This gets the TX from solana relay, then signs and sends the claim vested coins transaction.
 * NOTE: This is a web feature only because the user must sign with the same external wallet they used to launch the coin (wallet connect wallet).
 */
export const useClaimVestedCoins = (
  options?: UseMutationOptions<
    ClaimVestedCoinsResponse,
    Error,
    UseClaimVestedCoinsParams
  >
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUser } = useCurrentAccountUser()

  return useMutation<
    ClaimVestedCoinsResponse,
    Error,
    UseClaimVestedCoinsParams
  >({
    mutationFn: async ({
      tokenMint,
      externalWalletAddress
    }: UseClaimVestedCoinsParams): Promise<ClaimVestedCoinsResponse> => {
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
      
      // Ensure user has a token account to receive the artist coins
      const userBank = await createUserBankIfNeeded(sdk, {
        recordAnalytics: track,
        mint: tokenMint,
        ethAddress: currentUser?.erc_wallet
      })
      if (!userBank) {
        throw new Error('Unable to get or create artist coin SPL wallet address')
      }
      
      // Get the claim vested coins transaction from the relay
      const claimVestedCoinsResponse =
        await sdk.services.solanaRelay.claimVestedCoins({
          tokenMint,
          ownerWalletAddress: externalWalletAddress,
          receiverWalletAddress: userBank.toString()
        })

      const { claimVestedCoinsTxs: serializedTxs } = claimVestedCoinsResponse

      // Transaction is sent from the backend as a serialized base64 string
      const claimVestedCoinsTxs = serializedTxs.map((tx: string) =>
        VersionedTransaction.deserialize(Buffer.from(tx, 'base64'))
      )

      // Triggers 3rd party wallet to sign and send the transaction
      const allTransactions =
        await solanaProvider.signAllTransactions(claimVestedCoinsTxs)

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
        name: 'Artist coin vested coins claim error',
        additionalInfo: {
          ...params
        }
      })
      options?.onError?.(error, params, undefined)
    },
    onSuccess: (data, variables, context) => {
      // Optimistically update the coin data
      const queryKey = getArtistCoinQueryKey(variables.tokenMint)
      queryClient.setQueryData<Coin>(queryKey, (existingCoin) => {
        if (!existingCoin) return existingCoin
        // TODO: Update this when we have vested coin amount in the Coin type
        // For now, just invalidate the query to refetch fresh data
        return existingCoin
      })

      // Invalidate coin queries to refresh vested coin amounts
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.coins]
      })

      // Invalidate user coin balance to refresh the claimed coins
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.userCoins]
      })

      // Call the original onSuccess if provided
      options?.onSuccess?.(data, variables, context)
    }
  })
}

