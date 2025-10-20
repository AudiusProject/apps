import { useQueryContext } from '@audius/common/api'
import { ErrorLevel, Feature } from '@audius/common/models'
import {
  SwapErrorType,
  SwapStatus,
  SwapTokensResult
} from '@audius/common/src/api/tan-query/jupiter/types'
import { getExternalWalletBalanceQueryKey } from '@audius/common/src/api/tan-query/wallets/useExternalWalletBalance'
import {
  getJupiterQuoteByMintWithRetry,
  jupiterInstance
} from '@audius/common/src/services/Jupiter'
import { FixedDecimal } from '@audius/fixed-decimal'
import { SwapRequest } from '@jup-ag/api'
import type { Provider as SolanaProvider } from '@reown/appkit-adapter-solana/react'
import { VersionedTransaction } from '@solana/web3.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { appkitModal } from 'app/ReownAppKitModal'
import { reportToSentry } from 'store/errors/reportToSentry'

type ExternalWalletSwapParams = {
  amountUi: number
  inputMint: string
  outputMint: string
  slippageBps?: number
  wrapUnwrapSol?: boolean
  inputDecimals: number
  outputDecimals: number
  walletAddress: string
}
export const useExternalWalletSwap = () => {
  const { audiusSdk, env } = useQueryContext()
  const queryClient = useQueryClient()
  return useMutation<SwapTokensResult, Error, ExternalWalletSwapParams>({
    mutationFn: async (
      params: ExternalWalletSwapParams
    ): Promise<SwapTokensResult> => {
      const hookProgress = {
        receivedQuote: false,
        receivedSwapTx: false,
        sentSwapTx: false,
        confirmedSwapTx: false,
        userCancelled: false
      }
      const {
        amountUi,
        inputMint,
        outputMint,
        inputDecimals,
        outputDecimals,
        walletAddress
      } = params

      try {
        const sdk = await audiusSdk()
        const appKitSolanaProvider =
          appkitModal.getProvider<SolanaProvider>('solana')

        if (!appKitSolanaProvider) {
          throw new Error('Missing appKitSolanaProvider')
        }
        // Get jupiter quote first (allow indirect routes through AUDIO for DBC swaps)
        const { quoteResult: quote } = await getJupiterQuoteByMintWithRetry({
          inputMint,
          outputMint,
          inputDecimals,
          outputDecimals,
          amountUi,
          swapMode: 'ExactIn',
          onlyDirectRoutes: false
        })

        hookProgress.receivedQuote = true

        // Generate a jupiter swap TX
        const swapRequest: SwapRequest = {
          quoteResponse: quote.quote,
          userPublicKey: walletAddress,
          dynamicSlippage: true, // Uses the slippage from the quote
          useSharedAccounts: false // Shared accounts cant be used for AMM pool swaps
        }
        const swapTx = await jupiterInstance.swapPost({ swapRequest })

        hookProgress.receivedSwapTx = true

        // Deserialize the base64-encoded transaction
        const decoded = Buffer.from(swapTx.swapTransaction, 'base64')
        const transaction = VersionedTransaction.deserialize(decoded)

        const signedTx = await appKitSolanaProvider.signTransaction(transaction)
        hookProgress.sentSwapTx = true

        const txSignature =
          await sdk.services.solanaClient.connection.sendTransaction(signedTx)

        const result =
          await sdk.services.solanaClient.connection.confirmTransaction(
            txSignature,
            'confirmed'
          )
        if (result.value.err) {
          throw new Error(
            `Transaction confirmed but failed: ${JSON.stringify(result.value.err)}`
          )
        }
        hookProgress.confirmedSwapTx = true

        return {
          status: SwapStatus.SUCCESS,
          signature: txSignature,
          inputAmount: {
            amount: quote.inputAmount.amount,
            uiAmount: amountUi
          },
          outputAmount: {
            amount: quote.outputAmount.amount,
            uiAmount: quote.outputAmount.uiAmount
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        console.error('External wallet swap failed:', error, hookProgress)

        // Determine error type based on progress
        let errorType = SwapErrorType.UNKNOWN
        let errorStage = 'UNKNOWN'

        if (errorMessage.includes('User rejected')) {
          hookProgress.userCancelled = true
          errorType = SwapErrorType.WALLET_ERROR
          errorStage = 'USER_REJECTED'
        } else if (!hookProgress.receivedQuote) {
          errorType = SwapErrorType.QUOTE_FAILED
          errorStage = 'GETTING_QUOTE'
        } else if (!hookProgress.receivedSwapTx) {
          errorType = SwapErrorType.BUILD_FAILED
          errorStage = 'BUILDING_TRANSACTION'
        } else if (!hookProgress.sentSwapTx) {
          errorType = SwapErrorType.WALLET_ERROR
          errorStage = 'SIGNING_TRANSACTION'
        } else if (!hookProgress.confirmedSwapTx) {
          errorType = SwapErrorType.RELAY_FAILED
          errorStage = 'SENDING_TRANSACTION'
        }

        reportToSentry({
          error: error instanceof Error ? error : new Error(errorMessage),
          level: ErrorLevel.Error,
          feature: Feature.ArtistCoins,
          name: 'External Wallet Swap Error',
          additionalInfo: {
            ...params,
            progress: hookProgress,
            errorStage
          }
        })

        return {
          status: SwapStatus.ERROR,
          errorStage,
          error: {
            type: errorType,
            message: errorMessage
          }
        }
      }
    },
    onSuccess: (result, params) => {
      // NOTE: due to how we are catching errors in the function, this onSuccess will still run on a handled error
      // (since we're still returning a result no matter what)
      if (result.status === SwapStatus.SUCCESS) {
        // Update external wallet balances optimistically
        // NOTE: invalidate queries does not work here, need to manually update the balances

        // Check for AUDIO as an edge case since it's stored in a different query hook
        const isSpendingAudio = params.inputMint === env.WAUDIO_MINT_ADDRESS
        const isReceivingAudio = params.outputMint === env.WAUDIO_MINT_ADDRESS
        // Update input token balance (subtract the amount spent)
        if (result.inputAmount && !isSpendingAudio) {
          const inputTokenQueryKey = getExternalWalletBalanceQueryKey({
            walletAddress: params.walletAddress,
            mint: params.inputMint
          })

          queryClient.setQueryData(
            inputTokenQueryKey,
            (oldBalance: FixedDecimal | undefined) => {
              if (!oldBalance) return oldBalance
              const currentAmount = Number(oldBalance.toString())
              const inputAmount = result.inputAmount!.uiAmount
              const newAmount = Math.max(0, currentAmount - inputAmount) // Ensure non-negative
              return new FixedDecimal(newAmount, oldBalance.decimalPlaces)
            }
          )
        }

        // Update output token balance (add the amount received)
        if (result.outputAmount && !isReceivingAudio) {
          const outputTokenQueryKey = getExternalWalletBalanceQueryKey({
            walletAddress: params.walletAddress,
            mint: params.outputMint
          })

          queryClient.setQueryData(
            outputTokenQueryKey,
            (oldBalance: FixedDecimal | undefined) => {
              if (!oldBalance) {
                // If no previous balance, create a new FixedDecimal with the output amount
                return new FixedDecimal(
                  result.outputAmount!.uiAmount,
                  params.outputDecimals
                )
              }
              const currentAmount = Number(oldBalance.toString())
              const outputAmount = result.outputAmount!.uiAmount
              const newAmount = currentAmount + outputAmount
              return new FixedDecimal(newAmount, oldBalance.decimalPlaces)
            }
          )
        }
      }
    }
  })
}
