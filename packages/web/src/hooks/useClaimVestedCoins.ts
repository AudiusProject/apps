import { type Coin } from '@audius/common/adapters'
import {
  getArtistCoinQueryKey,
  getUserCoinQueryKey,
  useCurrentAccountUser,
  useQueryContext,
  QUERY_KEYS
} from '@audius/common/api'
import { Feature } from '@audius/common/models'
import type { UserCoinWithAccounts } from '@audius/sdk'
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

export type ClaimVestedCoinsResult = {
  signature: string
  availableAmount?: string
  userClaimedAmount?: string
  rewardsPoolClaimedAmount?: string
}

/**
 * Hook for claiming vested/unlocked artist coins from the vesting schedule.
 * After an artist coin graduates, the artist's reserved coins unlock daily over a 5-year period.
 * This gets the TX from solana relay, then signs and sends the claim vested coins transaction.
 * NOTE: This is a web feature only because the user must sign with the same external wallet they used to launch the coin (wallet connect wallet).
 */
export const useClaimVestedCoins = (
  options?: UseMutationOptions<
    ClaimVestedCoinsResult,
    Error,
    UseClaimVestedCoinsParams
  >
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUser } = useCurrentAccountUser()

  return useMutation<ClaimVestedCoinsResult, Error, UseClaimVestedCoinsParams>({
    mutationFn: async ({
      tokenMint,
      externalWalletAddress,
      rewardsPoolPercentage
    }: UseClaimVestedCoinsParams): Promise<ClaimVestedCoinsResult> => {
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
      const {
        claimVestedCoinsTxs: serializedTxs,
        availableAmount,
        userClaimedAmount,
        rewardsPoolClaimedAmount
      } = await sdk.services.solanaRelay.claimVestedCoins({
        tokenMint,
        ownerWalletAddress: externalWalletAddress,
        receiverWalletAddress: userBank.toString(),
        rewardsPoolPercentage
      })

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
        signature,
        availableAmount,
        userClaimedAmount,
        rewardsPoolClaimedAmount
      }
    },
    ...options,
    onError: (error, params) => {
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
    onSuccess: (data: ClaimVestedCoinsResult, variables, context) => {
      // Optimistically update the coin data with new locker amounts
      const queryKey = getArtistCoinQueryKey(variables.tokenMint)
      queryClient.setQueryData<Coin>(queryKey, (existingCoin) => {
        if (
          !existingCoin ||
          !existingCoin.artistLocker ||
          !data.availableAmount
        )
          return existingCoin

        const claimedAmount = parseFloat(data.availableAmount)
        return {
          ...existingCoin,
          artistLocker: {
            ...existingCoin.artistLocker,
            // Subtract the claimed amount from claimable
            claimable: Math.max(
              0,
              (existingCoin.artistLocker.claimable ?? 0) - claimedAmount
            ),
            // Update unlocked amount if it exists (adding claimed to unlocked)
            unlocked: existingCoin.artistLocker.unlocked
              ? existingCoin.artistLocker.unlocked + claimedAmount
              : existingCoin.artistLocker.unlocked
          },
          rewardPool: existingCoin.rewardPool
            ? {
                ...existingCoin.rewardPool,
                balance:
                  (existingCoin.rewardPool.balance ?? 0) +
                  parseFloat(data.rewardsPoolClaimedAmount ?? '0')
              }
            : existingCoin.rewardPool
        }
      })

      // Optimistically update the user's coin balance
      if (data.userClaimedAmount && currentUser?.user_id) {
        const claimedAmount = BigInt(data.userClaimedAmount)
        const userCoinQueryKey = getUserCoinQueryKey(
          variables.tokenMint,
          currentUser.user_id
        )

        queryClient.setQueryData<UserCoinWithAccounts | null>(
          userCoinQueryKey,
          (existingUserCoin) => {
            if (!existingUserCoin) return existingUserCoin

            return {
              ...existingUserCoin,
              balance: Number(
                BigInt(existingUserCoin.balance.toString()) + claimedAmount
              )
            }
          }
        )
      }

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.coins]
      })

      // Invalidate user coin balance to refresh the claimed coins (fallback)
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.userCoins]
      })

      options?.onSuccess?.(data, variables, context)
    }
  })
}
