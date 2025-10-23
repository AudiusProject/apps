import { type Coin } from '@audius/common/adapters'
import {
  getArtistCoinQueryKey,
  useCurrentAccountUser,
  useQueryContext,
  QUERY_KEYS
} from '@audius/common/api'
import { Feature } from '@audius/common/models'
import type { Provider as SolanaProvider } from '@reown/appkit-adapter-solana/react'
import { PublicKey, VersionedTransaction } from '@solana/web3.js'
import {
  useMutation,
  UseMutationOptions,
  useQueryClient
} from '@tanstack/react-query'

import { appkitModal } from 'app/ReownAppKitModal'
import { reportToSentry } from 'store/errors/reportToSentry'

export type UseClaimVestedCoinsParams = {
  tokenMint: string
  externalWalletAddress: string
  rewardsPoolPercentage: number
}

export type ClaimVestedCoinsResponse = {
  signature: string
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
      externalWalletAddress,
      rewardsPoolPercentage
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

      const { userBank } =
        await sdk.services.claimableTokensClient.getOrCreateUserBank({
          ethWallet: currentUser?.erc_wallet,
          mint: new PublicKey(tokenMint)
        })

      if (!userBank) {
        throw new Error(
          'Unable to get or create user bank for claiming vested coins'
        )
      }

      // Get the claim vested coins transaction from relay
      // This transaction will:
      // 1. Claim vested tokens to the external wallet (which must sign)
      // 2. Transfer tokens from external wallet to user bank (in same tx)
      const claimVestedCoinsResponse =
        await sdk.services.solanaRelay.claimVestedCoins({
          tokenMint,
          ownerWalletAddress: externalWalletAddress,
          receiverWalletAddress: userBank.toString(),
          rewardsPoolPercentage
        })

      const { claimVestedCoinsTxs: serializedTxs } = claimVestedCoinsResponse

      // Transaction is sent from the backend as a serialized base64 string
      const claimVestedCoinsTxs = serializedTxs.map((tx: string) =>
        VersionedTransaction.deserialize(
          new Uint8Array(Buffer.from(tx, 'base64'))
        )
      )

      // Triggers 3rd party wallet to sign the transaction
      const signedTransaction = await solanaProvider.signTransaction(
        claimVestedCoinsTxs[0]
      )

      // Relay the transaction (we're not paying fees but we want the retry logic and logging)
      const { signature } = await sdk.services.solanaRelay.relay({
        transaction: signedTransaction,
        sendOptions: {
          skipPreflight: true
        }
      })

      return {
        signature
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
