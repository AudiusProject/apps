import {
  getFanClubQueryKey,
  useCurrentAccountUser,
  useQueryContext,
  pollUntilAudioBalanceChanges
} from '@audius/common/api'
import { createUserBankIfNeeded } from '@audius/common/src/services/audius-backend/solana'
import type { Provider as SolanaProvider } from '@reown/appkit-adapter-solana/react'
import { VersionedTransaction } from '@solana/web3.js'
import {
  useMutation,
  UseMutationOptions,
  useQueryClient
} from '@tanstack/react-query'

import { appkitModal } from 'app/ReownAppKitModal'
import { track } from 'services/analytics'
export type UseClaimFeesParams = {
  tokenMint: string
  externalWalletAddress: string
}

export type ClaimFeesResponse = {
  signatures: string[]
}

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
      const claimFeesResponse = await sdk.services.solanaRelay.claimFees({
        tokenMint,
        ownerWalletAddress: externalWalletAddress,
        receiverWalletAddress: userBank.toString()
      })

      const { claimFeeTxs: serializedTxs } = claimFeesResponse

      const claimFeesTxs = serializedTxs.map((tx: string) =>
        VersionedTransaction.deserialize(Buffer.from(tx, 'base64'))
      )

      const allTransactions =
        await solanaProvider.signAllTransactions(claimFeesTxs)

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
      console.error(error)
    },
    onSuccess: async (data, variables, context) => {
      const queryKey = getFanClubQueryKey(variables.tokenMint)
      await queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          artistFees: {
            ...oldData.artistFees,
            unclaimedFees: 0
          }
        }
      })

      options?.onSuccess?.(data, variables, context)

      if (currentUser?.spl_wallet) {
        await pollUntilAudioBalanceChanges(queryClient, currentUser.spl_wallet)
      }
    }
  })
}
