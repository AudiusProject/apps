import {
  optimisticallyUpdateSwapBalances,
  useCurrentAccountUser,
  useQueryContext,
  getExternalWalletBalanceQueryKey,
  SwapErrorType,
  SwapStatus,
  SwapTokensParams,
  SwapTokensResult,
  getConnectedWalletsQueryOptions
} from '@audius/common/api'
import { ErrorLevel, Feature } from '@audius/common/models'
import {
  convertJupiterInstructions,
  getJupiterQuoteByMintWithRetry,
  jupiterInstance
} from '@audius/common/src/services/Jupiter'
import { TOKEN_LISTING_MAP } from '@audius/common/store'
import { removeNullable } from '@audius/common/utils'
import { FixedDecimal } from '@audius/fixed-decimal'
import {
  QuoteResponse,
  SwapInstructionsResponse,
  SwapRequest
} from '@jup-ag/api'
import type { Provider as SolanaProvider } from '@reown/appkit-adapter-solana/react'
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { appkitModal } from 'app/ReownAppKitModal'
import { reportToSentry } from 'store/errors/reportToSentry'

type BaseSwapParams = {
  walletAddress: string
}

type SwapAmount = {
  amount: number
  uiAmount: number
}

export type ExternalWalletSwapParams = BaseSwapParams & {
  inputDecimals: number
  outputDecimals: number
} & SwapTokensParams

type IndirectSwapParams = BaseSwapParams & {
  inputMint: string
  outputMint: string
  audioMint: string
  inputDecimals: number
  outputDecimals: number
  audioDecimals: number
  amountUi: number
  solanaConnection: Connection
}

const getIndirectSwapTx = async ({
  inputMint,
  outputMint,
  audioMint,
  inputDecimals,
  outputDecimals,
  audioDecimals,
  amountUi,
  walletAddress,
  solanaConnection
}: IndirectSwapParams): Promise<{
  transaction: VersionedTransaction
  inputAmount: SwapAmount
  outputAmount: SwapAmount
}> => {
  // Get quote for first hop: input -> AUDIO
  const { quoteResult: firstQuote } = await getJupiterQuoteByMintWithRetry({
    inputMint,
    outputMint: audioMint,
    inputDecimals,
    outputDecimals: audioDecimals,
    amountUi,
    swapMode: 'ExactIn',
    onlyDirectRoutes: false
  })

  // Use the output of first swap as input for second swap
  const audioAmount = firstQuote.outputAmount.uiAmount

  // Get quote for second hop: AUDIO -> output
  const { quoteResult: secondQuote } = await getJupiterQuoteByMintWithRetry({
    inputMint: audioMint,
    outputMint,
    inputDecimals: audioDecimals,
    outputDecimals,
    amountUi: audioAmount,
    swapMode: 'ExactIn',
    onlyDirectRoutes: false
  })

  // Get instructions for both swaps
  const swapRequest1: SwapRequest = {
    quoteResponse: firstQuote.quote,
    userPublicKey: walletAddress,
    dynamicSlippage: true,
    useSharedAccounts: false
  }

  const swapRequest2: SwapRequest = {
    quoteResponse: secondQuote.quote,
    userPublicKey: walletAddress,
    dynamicSlippage: true,
    useSharedAccounts: false
  }

  let firstSwapInstructions: SwapInstructionsResponse
  let secondSwapInstructions: SwapInstructionsResponse

  try {
    firstSwapInstructions = await jupiterInstance.swapInstructionsPost({
      swapRequest: swapRequest1
    })
  } catch (e) {
    // Retry without shared accounts if it fails
    swapRequest1.useSharedAccounts = false
    firstSwapInstructions = await jupiterInstance.swapInstructionsPost({
      swapRequest: swapRequest1
    })
  }

  try {
    secondSwapInstructions = await jupiterInstance.swapInstructionsPost({
      swapRequest: swapRequest2
    })
  } catch (e) {
    // Retry without shared accounts if it fails
    swapRequest2.useSharedAccounts = false
    secondSwapInstructions = await jupiterInstance.swapInstructionsPost({
      swapRequest: swapRequest2
    })
  }

  // Convert instructions to TransactionInstructions
  const firstSetupInstructions = convertJupiterInstructions(
    firstSwapInstructions.setupInstructions ?? []
  )
  const firstSwapInstruction = convertJupiterInstructions([
    firstSwapInstructions.swapInstruction
  ])
  const firstCleanupInstructions = convertJupiterInstructions(
    firstSwapInstructions.cleanupInstruction
      ? [firstSwapInstructions.cleanupInstruction]
      : []
  )

  const secondSetupInstructions = convertJupiterInstructions(
    secondSwapInstructions.setupInstructions ?? []
  )
  const secondSwapInstruction = convertJupiterInstructions([
    secondSwapInstructions.swapInstruction
  ])
  const secondCleanupInstructions = convertJupiterInstructions(
    secondSwapInstructions.cleanupInstruction
      ? [secondSwapInstructions.cleanupInstruction]
      : []
  )

  // Combine all instructions
  const allInstructions: TransactionInstruction[] = [
    ...firstSetupInstructions,
    ...firstSwapInstruction,
    ...firstCleanupInstructions,
    ...secondSetupInstructions,
    ...secondSwapInstruction,
    ...secondCleanupInstructions
  ]

  // Combine address lookup table addresses from both swaps
  const lookupTableAddresses = [
    ...(firstSwapInstructions.addressLookupTableAddresses ?? []),
    ...(secondSwapInstructions.addressLookupTableAddresses ?? [])
  ]

  // Get recent blockhash
  const { blockhash } = await solanaConnection.getLatestBlockhash()

  // Build the combined transaction
  let message: ReturnType<TransactionMessage['compileToV0Message']>

  if (lookupTableAddresses.length > 0) {
    // Fetch lookup table accounts
    const lookupTableAccounts = await Promise.all(
      lookupTableAddresses.map(async (address) => {
        const result = await solanaConnection.getAddressLookupTable(
          new PublicKey(address)
        )
        return result.value
      })
    )

    const filteredLookupTableAccounts =
      lookupTableAccounts.filter(removeNullable)

    message = new TransactionMessage({
      payerKey: new PublicKey(walletAddress),
      recentBlockhash: blockhash,
      instructions: allInstructions
    }).compileToV0Message(filteredLookupTableAccounts)
  } else {
    message = new TransactionMessage({
      payerKey: new PublicKey(walletAddress),
      recentBlockhash: blockhash,
      instructions: allInstructions
    }).compileToV0Message()
  }

  const transaction = new VersionedTransaction(message)

  return {
    transaction,
    inputAmount: {
      amount: firstQuote.inputAmount.amount,
      uiAmount: amountUi
    },
    outputAmount: {
      amount: secondQuote.outputAmount.amount,
      uiAmount: secondQuote.outputAmount.uiAmount
    }
  }
}

const getDirectSwapTx = async (quote: QuoteResponse, walletAddress: string) => {
  // Generate a jupiter swap TX
  const swapRequest: SwapRequest = {
    quoteResponse: quote,
    userPublicKey: walletAddress,
    dynamicSlippage: true, // Uses the slippage from the quote
    useSharedAccounts: false // Shared accounts cant be used for AMM pool swaps
  }
  return await jupiterInstance.swapPost({ swapRequest })
}

export const useExternalWalletSwap = () => {
  const { audiusSdk, env } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: user } = useCurrentAccountUser()
  return useMutation<SwapTokensResult, Error, ExternalWalletSwapParams>({
    mutationFn: async (
      params: ExternalWalletSwapParams
    ): Promise<SwapTokensResult> => {
      const hookProgress = {
        receivedQuote: false,
        receivedSwapTx: false,
        signedTx: false,
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

        let transaction: VersionedTransaction
        let inputAmount: SwapAmount
        let outputAmount: SwapAmount

        // Try direct swap first, fall back to indirect swap through AUDIO if it fails
        try {
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

          const swapTx = await getDirectSwapTx(quote.quote, walletAddress)
          hookProgress.receivedSwapTx = true

          // Deserialize the base64-encoded transaction
          const decoded = Buffer.from(swapTx.swapTransaction, 'base64')
          transaction = VersionedTransaction.deserialize(decoded)

          inputAmount = {
            amount: quote.inputAmount.amount,
            uiAmount: amountUi
          }
          outputAmount = {
            amount: quote.outputAmount.amount,
            uiAmount: quote.outputAmount.uiAmount
          }
        } catch (directSwapError) {
          console.warn(
            'Direct swap failed, attempting indirect swap through AUDIO:',
            directSwapError
          )

          // Reset progress flags for indirect swap attempt
          hookProgress.receivedQuote = false
          hookProgress.receivedSwapTx = false

          // Attempt indirect swap: input -> AUDIO -> output
          const indirectResult = await getIndirectSwapTx({
            inputMint,
            outputMint,
            audioMint: env.WAUDIO_MINT_ADDRESS,
            inputDecimals,
            outputDecimals,
            audioDecimals: TOKEN_LISTING_MAP.AUDIO.decimals,
            amountUi,
            walletAddress,
            solanaConnection: sdk.services.solanaClient.connection
          })

          hookProgress.receivedQuote = true
          hookProgress.receivedSwapTx = true

          transaction = indirectResult.transaction
          inputAmount = indirectResult.inputAmount
          outputAmount = indirectResult.outputAmount
        }

        const signedTx = await appKitSolanaProvider.signTransaction(transaction)
        hookProgress.signedTx = true

        const txSignature =
          await sdk.services.solanaClient.sendTransaction(signedTx)
        hookProgress.sentSwapTx = true

        await sdk.services.solanaClient.confirmAllTransactions(
          [txSignature],
          'confirmed'
        )
        hookProgress.confirmedSwapTx = true

        return {
          status: SwapStatus.SUCCESS,
          signature: txSignature,
          inputAmount,
          outputAmount
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        console.error('External wallet swap failed:', error, hookProgress)

        // Determine error type based on progress
        let errorType = SwapErrorType.UNKNOWN
        let errorStage = 'UNKNOWN'
        let userCancelled = false

        if (errorMessage.includes('User rejected')) {
          userCancelled = true
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
            errorStage,
            userCancelled
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
        // Update internal wallet balances & user info
        optimisticallyUpdateSwapBalances(params, result, queryClient, user, env)

        if (user?.user_id) {
          queryClient.invalidateQueries({
            queryKey: getConnectedWalletsQueryOptions(
              { audiusSdk },
              { userId: user.user_id }
            ).queryKey
          })
        }

        // Update external wallet balances
        // NOTE: invalidate queries does not work here, need to manually update the balances

        const isSpendingAudio = params.inputMint === env.WAUDIO_MINT_ADDRESS
        const isReceivingAudio = params.outputMint === env.WAUDIO_MINT_ADDRESS
        // Update input token balance (subtract the amount spent)
        if (result.inputAmount && !isSpendingAudio) {
          queryClient.setQueryData(
            getExternalWalletBalanceQueryKey({
              walletAddress: params.walletAddress,
              mint: params.inputMint
            }),
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
          queryClient.setQueryData(
            getExternalWalletBalanceQueryKey({
              walletAddress: params.walletAddress,
              mint: params.outputMint
            }),
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
