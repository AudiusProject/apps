import { AUDIO, wAUDIO } from '@audius/fixed-decimal'
import { PublicKey } from '@solana/web3.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { Chain, Name, SolanaWalletAddress } from '~/models'
import { getErrorMessage } from '~/utils'

import { getUserCoinQueryKey } from '../coins/useUserCoin'
import { useCurrentAccountUser } from '../users/account/accountSelectors'
import { useWalletAddresses } from '../users/account/useWalletAddresses'

import { getWalletAudioBalanceQueryKey } from './useAudioBalance'
import { useTokenBalance } from './useTokenBalance'

export type SendTokensParams = {
  recipientWallet: SolanaWalletAddress
  amount: bigint
}

export type SendTokensResult = {
  signature: string
  success: boolean
}

/**
 * Hook for sending tokens on Solana blockchain.
 * This hook handles only Solana transfers, not ETH transfers.
 *
 * @returns Mutation object with sendTokens function and status
 */
export const useSendTokens = ({ mint }: { mint: string }) => {
  const queryClient = useQueryClient()
  const { audiusBackend, audiusSdk, reportToSentry, analytics, env } =
    useQueryContext()
  const { data: walletAddresses } = useWalletAddresses()
  const { data: currentUser } = useCurrentAccountUser()

  const { data: tokenBalance } = useTokenBalance({
    mint,
    includeExternalWallets: false,
    includeStaked: false
  })

  const isAudioMint = mint === env.WAUDIO_MINT_ADDRESS

  return useMutation({
    mutationFn: async ({
      recipientWallet,
      amount
    }: SendTokensParams): Promise<SendTokensResult> => {
      try {
        const currentUser = walletAddresses?.currentUser
        if (!currentUser) {
          throw new Error('Failed to retrieve current user wallet address')
        }

        const sdk = await audiusSdk()

        if (!tokenBalance?.balance || tokenBalance.balance.value < amount) {
          throw new Error('Insufficient balance to send tokens')
        }

        const { res: signature } = await audiusBackend.sendTokens({
          address: recipientWallet,
          amount: amount as any, // TODO: Fix type mismatch between bigint and AudioWei
          ethAddress: currentUser,
          sdk,
          mint: new PublicKey(mint) as any // TODO: Fix type mismatch between string and MintName | PublicKey
        })

        return {
          signature,
          success: true
        }
      } catch (error) {
        console.error('Error sending tokens:', error)

        const errorMessage = getErrorMessage(error)

        if (errorMessage === 'Missing social proof') {
          throw new Error('Missing social proof')
        }
        if (
          errorMessage ===
          'Recipient has no $AUDIO token account. Please install Phantom-Wallet to create one.'
        ) {
          throw new Error(errorMessage)
        }

        throw new Error('Something has gone wrong, please try again.')
      }
    },
    onMutate: async ({ amount }) => {
      const userId = currentUser?.user_id ?? null
      const queryKey = getUserCoinQueryKey(mint, userId)
      await queryClient.cancelQueries({ queryKey })

      const previousBalance = queryClient.getQueryData(queryKey)

      if (previousBalance) {
        queryClient.setQueryData(queryKey, (old) => {
          if (!old) return old

          const amountNumber = Number(amount)
          return {
            ...old,
            balance: old.balance - amountNumber,
            accounts: old.accounts?.map((account: any) =>
              account.isInAppWallet
                ? { ...account, balance: account.balance - amountNumber }
                : account
            )
          }
        })
      }

      // For AUDIO, also optimistically update the audio balance queries
      if (isAudioMint && currentUser?.spl_wallet) {
        // Update both staked and non-staked balance queries for the SOL wallet
        for (const includeStaked of [true, false]) {
          const audioQueryKey = getWalletAudioBalanceQueryKey({
            address: currentUser.spl_wallet,
            chain: Chain.Sol,
            includeStaked
          })
          await queryClient.cancelQueries({ queryKey: audioQueryKey })

          queryClient.setQueryData(audioQueryKey, (oldBalance: any) => {
            if (oldBalance === undefined) return oldBalance
            const currentBalance = oldBalance ?? AUDIO(0).value
            const amountAudio = AUDIO(wAUDIO(amount)).value
            const newBalance = currentBalance - amountAudio
            // Ensure balance doesn't go negative
            return newBalance >= 0 ? newBalance : AUDIO(0).value
          })
        }
      }

      return { previousBalance }
    },
    onSuccess: (_, { recipientWallet }) => {
      if (analytics) {
        const currentUser = walletAddresses?.currentUser
        if (currentUser) {
          analytics.track(
            analytics.make({
              eventName: Name.SEND_AUDIO_SUCCESS,
              from: currentUser,
              recipient: recipientWallet
            })
          )
        }
      }
    },
    onError: (error, { amount, recipientWallet }, context) => {
      if (context?.previousBalance) {
        const userId = currentUser?.user_id ?? null
        const queryKey = getUserCoinQueryKey(mint, userId)
        queryClient.setQueryData(queryKey, context.previousBalance)
      }

      // For AUDIO, invalidate the audio balance queries to refetch the correct balance
      if (isAudioMint && currentUser?.spl_wallet) {
        for (const includeStaked of [true, false]) {
          const audioQueryKey = getWalletAudioBalanceQueryKey({
            address: currentUser.spl_wallet,
            chain: Chain.Sol,
            includeStaked
          })
          queryClient.invalidateQueries({ queryKey: audioQueryKey })
        }
      }

      if (analytics) {
        const currentUser = walletAddresses?.currentUser
        if (currentUser) {
          analytics.track(
            analytics.make({
              eventName: Name.SEND_AUDIO_FAILURE,
              from: currentUser,
              recipient: recipientWallet,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          )
        }
      }

      if (reportToSentry) {
        reportToSentry({
          error: error instanceof Error ? error : new Error(error as string),
          name: 'Send Tokens',
          additionalInfo: {
            amount: amount.toString(),
            mint
          }
        })
      }
    }
  })
}
