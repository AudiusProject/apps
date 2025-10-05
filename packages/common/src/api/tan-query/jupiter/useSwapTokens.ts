import { AUDIO, AudioWei, wAUDIO } from '@audius/fixed-decimal'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  getUserCoinQueryKey,
  getUserQueryKey,
  getWalletAudioBalanceQueryKey,
  useCurrentAccountUser,
  useQueryContext
} from '~/api'
import type { QueryContextType } from '~/api/tan-query/utils/QueryContext'
import { Chain, Feature } from '~/models'
import type { User } from '~/models/User'
import { JupiterQuoteResult } from '~/services/Jupiter'

import { useTokens } from '../tokens/useTokens'

import { SwapOrchestrator } from './orchestrator'
import {
  SwapDependencies,
  SwapErrorType,
  SwapStatus,
  SwapTokensParams,
  SwapTokensResult
} from './types'
import { getSwapErrorResponse } from './utils'

const initializeSwapDependencies = async (
  solanaWalletService: QueryContextType['solanaWalletService'],
  audiusSdk: QueryContextType['audiusSdk'],
  queryClient: ReturnType<typeof useQueryClient>,
  user: User | undefined,
  audioMint: string
): Promise<SwapDependencies | { error: SwapTokensResult }> => {
  try {
    const [sdk, keypair] = await Promise.all([
      audiusSdk(),
      solanaWalletService.getKeypair()
    ])

    if (!keypair) {
      return {
        error: {
          status: SwapStatus.ERROR,
          error: {
            type: SwapErrorType.WALLET_ERROR,
            message: 'Wallet not initialised'
          }
        }
      }
    }

    const userPublicKey = keypair.publicKey
    const feePayer = await sdk.services.solanaClient.getFeePayer()
    const ethAddress = user?.wallet

    if (!ethAddress) {
      return {
        error: {
          status: SwapStatus.ERROR,
          error: {
            type: SwapErrorType.WALLET_ERROR,
            message: 'User wallet address not found'
          }
        }
      }
    }

    return {
      sdk,
      keypair,
      userPublicKey,
      feePayer,
      ethAddress,
      queryClient,
      user,
      audioMint
    }
  } catch (error) {
    return {
      error: {
        status: SwapStatus.ERROR,
        error: {
          type: SwapErrorType.WALLET_ERROR,
          message: 'Failed to initialize wallet dependencies'
        }
      }
    }
  }
}

/**
 * Hook for executing token swaps using Jupiter.
 * Swaps any supported SPL token (or SOL) for another.
 */
export const useSwapTokens = () => {
  const queryClient = useQueryClient()
  const { solanaWalletService, reportToSentry, audiusSdk, env } =
    useQueryContext()
  const { data: user } = useCurrentAccountUser()
  const { tokens } = useTokens()

  return useMutation<SwapTokensResult, Error, SwapTokensParams>({
    mutationFn: async (params): Promise<SwapTokensResult> => {
      let errorStage = 'UNKNOWN'
      let firstQuoteResult: JupiterQuoteResult | undefined
      let secondQuoteResult: JupiterQuoteResult | undefined
      let signature: string | undefined

      try {
        // Initialize dependencies
        errorStage = 'WALLET_INITIALIZATION'
        const dependenciesResult = await initializeSwapDependencies(
          solanaWalletService,
          audiusSdk,
          queryClient,
          user,
          env.WAUDIO_MINT_ADDRESS
        )

        if ('error' in dependenciesResult) {
          return dependenciesResult.error
        }

        const dependencies = dependenciesResult

        errorStage = 'SWAP_EXECUTION'
        const orchestrator = new SwapOrchestrator()
        const result = await orchestrator.executeSwap(
          params,
          dependencies,
          tokens
        )

        if (result.status === SwapStatus.ERROR) {
          if (result.errorStage) {
            errorStage = result.errorStage
          }

          reportToSentry({
            name: `JupiterSwap${result.errorStage || errorStage}Error`,
            error: new Error(result.error?.message || 'Unknown swap error'),
            feature: Feature.TanQuery,
            additionalInfo: {
              params,
              signature,
              errorStage: result.errorStage || errorStage,
              firstQuoteResponse: firstQuoteResult?.quote,
              secondQuoteResponse: secondQuoteResult?.quote
            }
          })

          // Throw error so React Query calls onError instead of onSuccess
          throw new Error(result.error?.message || 'Swap failed')
        }

        return result
      } catch (error: unknown) {
        reportToSentry({
          name: `JupiterSwap${errorStage}Error`,
          error: error as Error,
          feature: Feature.TanQuery,
          additionalInfo: {
            params,
            signature,
            errorStage,
            firstQuoteResponse: firstQuoteResult?.quote,
            secondQuoteResponse: secondQuoteResult?.quote
          }
        })

        return getSwapErrorResponse({
          errorStage,
          error: error as Error,
          inputAmount: firstQuoteResult?.inputAmount,
          outputAmount:
            secondQuoteResult?.outputAmount || firstQuoteResult?.outputAmount
        })
      }
    },
    onSuccess: (result, params) => {
      const { inputMint, outputMint } = params
      const { inputAmount, outputAmount } = result

      // Check if AUDIO is involved in the swap
      const isInputAudio = inputMint === env.WAUDIO_MINT_ADDRESS
      const isOutputAudio = outputMint === env.WAUDIO_MINT_ADDRESS

      // Handle artist coin optimistic updates (not AUDIO)
      if (inputMint && !isInputAudio) {
        queryClient.setQueryData(
          getUserCoinQueryKey(inputMint, user?.user_id),
          (prevAccountBalances) => {
            if (!prevAccountBalances) return null

            return {
              ...prevAccountBalances,
              // Update aggregate account balance (includes connected wallets)
              balance:
                prevAccountBalances?.balance - (inputAmount?.amount ?? 0),
              // Update internal wallet balance (we only do swaps against internal wallets)
              accounts: prevAccountBalances.accounts.map((account) =>
                account.isInAppWallet
                  ? {
                      ...account,
                      balance: account.balance - (inputAmount?.amount ?? 0)
                    }
                  : account
              )
            }
          }
        )
      }
      if (outputMint && !isOutputAudio) {
        queryClient.setQueryData(
          getUserCoinQueryKey(outputMint, user?.user_id),
          (prevAccountBalances) => {
            if (!prevAccountBalances) return null

            return {
              ...prevAccountBalances,
              // Update aggregate account balance (includes connected wallets)
              balance:
                prevAccountBalances?.balance + (outputAmount?.amount ?? 0),
              // Update internal wallet balance (we only do swaps against internal wallets)
              accounts: prevAccountBalances.accounts.map((account) =>
                account.isInAppWallet
                  ? {
                      ...account,
                      balance: account.balance + (outputAmount?.amount ?? 0)
                    }
                  : account
              )
            }
          }
        )
      }

      // If AUDIO is involved, optimistically update audioBalance queries
      if ((isInputAudio || isOutputAudio) && user?.spl_wallet) {
        // Calculate the net change in AudioWei
        // Note: inputAmount/outputAmount are in lamports (8 decimals for AUDIO on Solana)
        // but AudioWei expects Wei (18 decimals), so we need to convert using wAUDIO utility
        const inputAudioLamports = isInputAudio ? (inputAmount?.amount ?? 0) : 0
        const outputAudioLamports = isOutputAudio
          ? (outputAmount?.amount ?? 0)
          : 0

        // Convert from lamports (8 decimals) to Wei (18 decimals)
        const inputAudioWei = isInputAudio
          ? AUDIO(wAUDIO(BigInt(inputAudioLamports))).value
          : AUDIO(0).value
        const outputAudioWei = isOutputAudio
          ? AUDIO(wAUDIO(BigInt(outputAudioLamports))).value
          : AUDIO(0).value

        const netChange = outputAudioWei - inputAudioWei

        // Update the audioBalance queries for the SOL wallet
        // We need to update both includeStaked: false and includeStaked: true
        // because different parts of the app use different values
        for (const includeStaked of [false, true]) {
          const queryKey = getWalletAudioBalanceQueryKey({
            address: user.spl_wallet,
            chain: Chain.Sol,
            includeStaked
          })

          queryClient.setQueryData<AudioWei>(queryKey, (oldBalance) => {
            if (oldBalance === undefined) return oldBalance

            const currentBalance = oldBalance ?? AUDIO(0).value
            const newBalance = AUDIO(currentBalance + netChange).value

            // Ensure balance doesn't go negative
            return newBalance >= 0 ? newBalance : AUDIO(0).value
          })
        }
      }

      // Invalidate user query to ensure user data is fresh after swap
      queryClient.invalidateQueries({
        queryKey: getUserQueryKey(user?.user_id)
      })
    },
    onMutate: () => {
      return { status: SwapStatus.SENDING_TRANSACTION }
    }
  })
}
