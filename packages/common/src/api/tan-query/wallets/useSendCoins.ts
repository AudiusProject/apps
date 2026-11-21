import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { Name, SolanaWalletAddress } from '~/models'
import { getErrorMessage } from '~/utils'

import { getUserCoinQueryKey } from '../coins/useUserCoin'
import { useCurrentAccountUser } from '../users/account/accountSelectors'
import { useWalletAddresses } from '../users/account/useWalletAddresses'

import {
  invalidateAudioBalance,
  updateAudioBalanceOptimistically
} from './useAudioBalance'
import { useCoinBalance } from './useCoinBalance'

export type SendCoinsParams = {
  recipientWallet: SolanaWalletAddress
  amount: bigint
  recipientEthAddress?: string
  source?: string
  recipientHandle?: string
}

export type SendCoinsResult = {
  signature: string
  success: boolean
}

export const useSendCoins = ({ mint }: { mint: string }) => {
  const queryClient = useQueryClient()
  const { audiusBackend, audiusSdk, analytics, env } = useQueryContext()
  const { data: walletAddresses } = useWalletAddresses()
  const { data: currentUser } = useCurrentAccountUser()

  const { data: coinBalance } = useCoinBalance({
    mint,
    includeExternalWallets: true,
    includeStaked: false
  })

  const isAudioMint = mint === env.WAUDIO_MINT_ADDRESS

  return useMutation({
    mutationFn: async ({
      recipientWallet,
      amount,
      recipientEthAddress
    }: SendCoinsParams): Promise<SendCoinsResult> => {
      try {
        const currentUser = walletAddresses?.currentUser
        if (!currentUser) {
          throw new Error('Failed to retrieve current user wallet address')
        }

        const [sdk, { PublicKey }] = await Promise.all([
          audiusSdk(),
          import('@solana/web3.js')
        ])

        if (!coinBalance?.balance || coinBalance.balance.value < amount) {
          throw new Error('Insufficient balance to send tokens')
        }

        const { res: signature } = await audiusBackend.sendTokens({
          address: recipientWallet,
          amount: amount as any, // TODO: Fix type mismatch between bigint and AudioWei
          ethAddress: currentUser,
          sdk,
          mint: new PublicKey(mint) as any, // TODO: Fix type mismatch between string and MintName | PublicKey
          recipientEthAddress
        })

        return {
          signature,
          success: true
        }
      } catch (error) {
        console.error('Error sending coins:', error)

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
        if (
          errorMessage.includes('Failed to connect to Solana network') ||
          errorMessage.includes('Failed to get recent blockhash') ||
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('network')
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

      if (isAudioMint && currentUser?.spl_wallet) {
        updateAudioBalanceOptimistically({
          queryClient,
          splWallet: currentUser.spl_wallet,
          changeLamports: -amount
        })
      }

      return { previousBalance }
    },
    onSuccess: (_, { recipientWallet, amount, source, recipientHandle }) => {
      if (isAudioMint && analytics) {
        const senderWallet = walletAddresses?.currentUser
        if (senderWallet) {
          analytics.track(
            analytics.make({
              eventName: Name.SEND_AUDIO_SUCCESS,
              from: senderWallet,
              recipient: recipientWallet,
              amount: amount.toString(),
              source,
              senderHandle: currentUser?.handle ?? undefined,
              senderWallet,
              recipientHandle: recipientHandle ?? undefined,
              recipientWallet
            })
          )
        }
      }
    },
    onError: (
      error,
      { amount, recipientWallet, source, recipientHandle },
      context
    ) => {
      if (context?.previousBalance) {
        const userId = currentUser?.user_id ?? null
        const queryKey = getUserCoinQueryKey(mint, userId)
        queryClient.setQueryData(queryKey, context.previousBalance)
      }

      if (isAudioMint && currentUser?.spl_wallet) {
        invalidateAudioBalance({
          queryClient,
          splWallet: currentUser.spl_wallet
        })
      }

      if (isAudioMint && analytics) {
        const senderWallet = walletAddresses?.currentUser
        if (senderWallet) {
          analytics.track(
            analytics.make({
              eventName: Name.SEND_AUDIO_FAILURE,
              from: senderWallet,
              recipient: recipientWallet,
              error: error instanceof Error ? error.message : 'Unknown error',
              amount: amount.toString(),
              source,
              senderHandle: currentUser?.handle ?? undefined,
              senderWallet,
              recipientHandle: recipientHandle ?? undefined,
              recipientWallet
            })
          )
        }
      }

      console.error(
        'Send Coins',
        error instanceof Error ? error : new Error(error as string)
      )
    }
  })
}
