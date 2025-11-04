import {
  optimisticallyUpdateSwapBalances,
  useCurrentAccountUser,
  useQueryContext,
  getExternalWalletBalanceQueryKey,
  getArtistCoinQueryKey,
  SwapErrorType,
  SwapStatus,
  SwapTokensParams,
  SwapTokensResult
} from '@audius/common/api'
import { ErrorLevel, Feature } from '@audius/common/models'
import {
  getJupiterQuoteByMintWithRetry,
  jupiterInstance
} from '@audius/common/src/services/Jupiter'
import { NON_ARTIST_COIN_MINTS, TOKEN_LISTING_MAP } from '@audius/common/store'
import { FixedDecimal } from '@audius/fixed-decimal'
import { QuoteResponse, SwapRequest } from '@jup-ag/api'
import type { Provider as SolanaProvider } from '@reown/appkit-adapter-solana/react'
import {
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

type MeteoraSwapParams = BaseSwapParams & {
  inputMint: string
  outputMint: string
  inputDecimals: number
  outputDecimals: number
  amountUi: number
  audioMint: string
  audioDecimals: number
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

/**
 * Checks if a mint is an artist coin (not in NON_ARTIST_COIN_MINTS)
 */
const isArtistCoinMint = (mint: string): boolean => {
  return !NON_ARTIST_COIN_MINTS.includes(mint)
}

/**
 * Extracts decompiled instructions from a VersionedTransaction
 */
const extractInstructionsFromVersionedTx = (
  tx: VersionedTransaction
): TransactionInstruction[] => {
  const message = tx.message
  const accountKeys = message.staticAccountKeys

  return message.compiledInstructions.map((ix) => {
    const programId = accountKeys[ix.programIdIndex]
    const keys = ix.accountKeyIndexes.map((keyIndex) => {
      const pubkey = accountKeys[keyIndex]
      return {
        pubkey,
        isSigner: message.isAccountSigner(keyIndex),
        isWritable: message.isAccountWritable(keyIndex)
      }
    })

    return new TransactionInstruction({
      programId,
      keys,
      data: Buffer.from(ix.data)
    })
  })
}

/**
 * Combines two Meteora swap transactions into a single transaction
 * Used for artist-coin ↔ artist-coin swaps
 */
const getCombinedMeteoraSwapTx = async ({
  inputMint,
  outputMint,
  inputDecimals,
  outputDecimals,
  amountUi,
  walletAddress,
  audioMint,
  audioDecimals,
  solanaRelay,
  solanaConnection
}: {
  inputMint: string
  outputMint: string
  inputDecimals: number
  outputDecimals: number
  amountUi: number
  walletAddress: string
  audioMint: string
  audioDecimals: number
  solanaRelay: any
  solanaConnection: any
}): Promise<{
  transaction: VersionedTransaction
  inputAmount: SwapAmount
  outputAmount: SwapAmount
}> => {
  // First swap: artist-coin → AUDIO
  const rawInputAmount = BigInt(
    Math.floor(amountUi * Math.pow(10, inputDecimals))
  ).toString()

  const firstSwapResult = await solanaRelay.swapCoin({
    inputAmount: rawInputAmount,
    coinMint: inputMint,
    swapDirection: 'coinToAudio' as 'audioToCoin' | 'coinToAudio',
    userPublicKey: new PublicKey(walletAddress),
    isExternalWallet: true
  })

  const audioOutputAmount = firstSwapResult.outputAmount

  // Second swap: AUDIO → artist-coin
  const secondSwapResult = await solanaRelay.swapCoin({
    inputAmount: audioOutputAmount,
    coinMint: outputMint,
    swapDirection: 'audioToCoin' as 'audioToCoin' | 'coinToAudio',
    userPublicKey: new PublicKey(walletAddress),
    isExternalWallet: true
  })

  // Deserialize both transactions
  const firstTx = VersionedTransaction.deserialize(
    new Uint8Array(Buffer.from(firstSwapResult.transaction, 'base64'))
  )
  const secondTx = VersionedTransaction.deserialize(
    new Uint8Array(Buffer.from(secondSwapResult.transaction, 'base64'))
  )

  // Extract instructions from both transactions
  const firstInstructions = extractInstructionsFromVersionedTx(firstTx)
  const secondInstructions = extractInstructionsFromVersionedTx(secondTx)

  // Combine all instructions
  const allInstructions = [...firstInstructions, ...secondInstructions]

  // Get recent blockhash
  const { blockhash } = await solanaConnection.getLatestBlockhash()

  // Build combined transaction
  const message = new TransactionMessage({
    payerKey: new PublicKey(walletAddress),
    recentBlockhash: blockhash,
    instructions: allInstructions
  }).compileToV0Message()

  const transaction = new VersionedTransaction(message)

  return {
    transaction,
    inputAmount: {
      amount: Number(BigInt(rawInputAmount)),
      uiAmount: amountUi
    },
    outputAmount: {
      amount: Number(BigInt(secondSwapResult.outputAmount)),
      uiAmount:
        Number(BigInt(secondSwapResult.outputAmount)) /
        Math.pow(10, outputDecimals)
    }
  }
}

/**
 * Executes an indirect swap using two separate transactions
 * Used for USDC/SOL ↔ artist-coin swaps (Jupiter + Meteora)
 */
const executeIndirectSwapWithTwoTransactions = async ({
  inputMint,
  outputMint,
  inputDecimals,
  outputDecimals,
  amountUi,
  walletAddress,
  audioMint,
  audioDecimals,
  sdk,
  appKitSolanaProvider,
  hookProgress
}: {
  inputMint: string
  outputMint: string
  inputDecimals: number
  outputDecimals: number
  amountUi: number
  walletAddress: string
  audioMint: string
  audioDecimals: number
  sdk: any
  appKitSolanaProvider: any
  hookProgress: any
}): Promise<{
  finalSignature: string
  inputAmount: SwapAmount
  outputAmount: SwapAmount
}> => {
  const isInputArtistCoin = isArtistCoinMint(inputMint)

  // Determine which leg uses Jupiter and which uses Meteora
  if (isInputArtistCoin) {
    // artist-coin → AUDIO (Meteora), then AUDIO → USDC/SOL (Jupiter)

    // First transaction: artist-coin → AUDIO (Meteora)
    const firstLegResult = await getMeteoraSwapTx({
      inputMint,
      outputMint: audioMint,
      inputDecimals,
      outputDecimals: audioDecimals,
      amountUi,
      walletAddress,
      audioMint,
      audioDecimals,
      solanaRelay: sdk.services.solanaRelay
    })

    hookProgress.receivedQuote = true
    hookProgress.receivedSwapTx = true

    const signedTx1 = await appKitSolanaProvider.signTransaction(
      firstLegResult.transaction
    )
    const tx1Signature =
      await sdk.services.solanaClient.sendTransaction(signedTx1)
    await sdk.services.solanaClient.confirmAllTransactions(
      [tx1Signature],
      'confirmed'
    )

    // Second transaction: AUDIO → USDC/SOL (Jupiter)
    const { quoteResult: secondQuote } = await getJupiterQuoteByMintWithRetry({
      inputMint: audioMint,
      outputMint,
      inputDecimals: audioDecimals,
      outputDecimals,
      amountUi: firstLegResult.outputAmount.uiAmount,
      swapMode: 'ExactIn',
      onlyDirectRoutes: false
    })

    const swapTx2 = await getDirectSwapTx(secondQuote.quote, walletAddress)
    const decoded2 = Buffer.from(swapTx2.swapTransaction, 'base64')
    const transaction2 = VersionedTransaction.deserialize(
      new Uint8Array(decoded2)
    )

    const signedTx2 = await appKitSolanaProvider.signTransaction(transaction2)
    hookProgress.signedTx = true

    const tx2Signature =
      await sdk.services.solanaClient.sendTransaction(signedTx2)
    hookProgress.sentSwapTx = true

    await sdk.services.solanaClient.confirmAllTransactions(
      [tx2Signature],
      'confirmed'
    )
    hookProgress.confirmedSwapTx = true

    return {
      finalSignature: tx2Signature,
      inputAmount: firstLegResult.inputAmount,
      outputAmount: {
        amount: secondQuote.outputAmount.amount,
        uiAmount: secondQuote.outputAmount.uiAmount
      }
    }
  } else {
    // USDC/SOL → AUDIO (Jupiter), then AUDIO → artist-coin (Meteora)

    // First transaction: USDC/SOL → AUDIO (Jupiter)
    const { quoteResult: firstQuote } = await getJupiterQuoteByMintWithRetry({
      inputMint,
      outputMint: audioMint,
      inputDecimals,
      outputDecimals: audioDecimals,
      amountUi,
      swapMode: 'ExactIn',
      onlyDirectRoutes: false
    })

    hookProgress.receivedQuote = true

    const swapTx1 = await getDirectSwapTx(firstQuote.quote, walletAddress)
    hookProgress.receivedSwapTx = true

    const decoded1 = Buffer.from(swapTx1.swapTransaction, 'base64')
    const transaction1 = VersionedTransaction.deserialize(
      new Uint8Array(decoded1)
    )

    const signedTx1 = await appKitSolanaProvider.signTransaction(transaction1)
    const tx1Signature =
      await sdk.services.solanaClient.sendTransaction(signedTx1)
    await sdk.services.solanaClient.confirmAllTransactions(
      [tx1Signature],
      'confirmed'
    )

    // Second transaction: AUDIO → artist-coin (Meteora)
    const secondLegResult = await getMeteoraSwapTx({
      inputMint: audioMint,
      outputMint,
      inputDecimals: audioDecimals,
      outputDecimals,
      amountUi: firstQuote.outputAmount.uiAmount,
      walletAddress,
      audioMint,
      audioDecimals,
      solanaRelay: sdk.services.solanaRelay
    })

    const signedTx2 = await appKitSolanaProvider.signTransaction(
      secondLegResult.transaction
    )
    hookProgress.signedTx = true

    const tx2Signature =
      await sdk.services.solanaClient.sendTransaction(signedTx2)
    hookProgress.sentSwapTx = true

    await sdk.services.solanaClient.confirmAllTransactions(
      [tx2Signature],
      'confirmed'
    )
    hookProgress.confirmedSwapTx = true

    return {
      finalSignature: tx2Signature,
      inputAmount: {
        amount: firstQuote.inputAmount.amount,
        uiAmount: amountUi
      },
      outputAmount: secondLegResult.outputAmount
    }
  }
}

/**
 * Gets a Meteora swap transaction for artist coin swaps
 * Meteora only supports swaps between AUDIO and artist coins
 */
const getMeteoraSwapTx = async ({
  inputMint,
  outputMint,
  inputDecimals,
  outputDecimals,
  amountUi,
  walletAddress,
  audioMint,
  audioDecimals,
  solanaRelay
}: MeteoraSwapParams & {
  solanaRelay: any
}): Promise<{
  transaction: VersionedTransaction
  inputAmount: SwapAmount
  outputAmount: SwapAmount
}> => {
  // Determine which mint is the artist coin and which is AUDIO
  const isInputAudio = inputMint === audioMint
  const isOutputAudio = outputMint === audioMint

  if (!isInputAudio && !isOutputAudio) {
    throw new Error(
      'Meteora swaps only support swaps between AUDIO and artist coins'
    )
  }

  const artistCoinMint = isInputAudio ? outputMint : inputMint
  const swapDirection = isInputAudio ? 'audioToCoin' : 'coinToAudio'

  // Convert UI amount to raw amount (bigint string)
  // For Meteora, we need the raw amount of the input token
  const rawInputAmount = BigInt(
    Math.floor(amountUi * Math.pow(10, inputDecimals))
  ).toString()

  // Get quote first
  await solanaRelay.getSwapCoinQuote({
    inputAmount: rawInputAmount,
    coinMint: artistCoinMint,
    swapDirection: swapDirection as 'audioToCoin' | 'coinToAudio'
  })

  // Get swap transaction
  const swapResult = await solanaRelay.swapCoin({
    inputAmount: rawInputAmount,
    coinMint: artistCoinMint,
    swapDirection: swapDirection as 'audioToCoin' | 'coinToAudio',
    userPublicKey: new PublicKey(walletAddress),
    isExternalWallet: true
  })

  // Deserialize the base64-encoded transaction
  const decoded = Buffer.from(swapResult.transaction, 'base64')
  const transaction = VersionedTransaction.deserialize(new Uint8Array(decoded))

  // Convert raw amounts back to UI amounts
  const rawInputAmountBigInt = BigInt(rawInputAmount)
  const rawOutputAmountBigInt = BigInt(swapResult.outputAmount)

  const inputAmount = {
    amount: Number(rawInputAmountBigInt),
    uiAmount: amountUi
  }

  const outputAmount = {
    amount: Number(rawOutputAmountBigInt),
    uiAmount: Number(rawOutputAmountBigInt) / Math.pow(10, outputDecimals)
  }

  return {
    transaction,
    inputAmount,
    outputAmount
  }
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

        // Check if swap involves artist coins
        const isInputArtistCoin = isArtistCoinMint(inputMint)
        const isOutputArtistCoin = isArtistCoinMint(outputMint)
        const isInputAudio = inputMint === env.WAUDIO_MINT_ADDRESS
        const isOutputAudio = outputMint === env.WAUDIO_MINT_ADDRESS

        // Determine swap type
        const isDirectMeteoraSwap =
          (isInputArtistCoin && isOutputAudio) ||
          (isInputAudio && isOutputArtistCoin)

        const isBothArtistCoins = isInputArtistCoin && isOutputArtistCoin
        const isMixedIndirectSwap =
          (isInputArtistCoin || isOutputArtistCoin) &&
          !isInputAudio &&
          !isOutputAudio &&
          !isBothArtistCoins

        if (isDirectMeteoraSwap) {
          // Case 1: Direct Meteora swap: AUDIO ↔ artist-coin (single transaction)
          const meteoraResult = await getMeteoraSwapTx({
            inputMint,
            outputMint,
            inputDecimals,
            outputDecimals,
            amountUi,
            walletAddress,
            audioMint: env.WAUDIO_MINT_ADDRESS,
            audioDecimals: TOKEN_LISTING_MAP.AUDIO.decimals,
            solanaRelay: sdk.services.solanaRelay
          })

          hookProgress.receivedQuote = true
          hookProgress.receivedSwapTx = true

          transaction = meteoraResult.transaction
          inputAmount = meteoraResult.inputAmount
          outputAmount = meteoraResult.outputAmount
        } else if (isBothArtistCoins) {
          // Case 2: artist-coin ↔ artist-coin (ONE combined transaction with both Meteora swaps)
          const combinedResult = await getCombinedMeteoraSwapTx({
            inputMint,
            outputMint,
            inputDecimals,
            outputDecimals,
            amountUi,
            walletAddress,
            audioMint: env.WAUDIO_MINT_ADDRESS,
            audioDecimals: TOKEN_LISTING_MAP.AUDIO.decimals,
            solanaRelay: sdk.services.solanaRelay,
            solanaConnection: sdk.services.solanaClient.connection
          })

          hookProgress.receivedQuote = true
          hookProgress.receivedSwapTx = true

          transaction = combinedResult.transaction
          inputAmount = combinedResult.inputAmount
          outputAmount = combinedResult.outputAmount
        } else if (isMixedIndirectSwap) {
          // Case 3: USDC/SOL ↔ artist-coin (TWO separate transactions: Jupiter + Meteora)
          const intermediateAmount =
            await executeIndirectSwapWithTwoTransactions({
              inputMint,
              outputMint,
              inputDecimals,
              outputDecimals,
              amountUi,
              walletAddress,
              audioMint: env.WAUDIO_MINT_ADDRESS,
              audioDecimals: TOKEN_LISTING_MAP.AUDIO.decimals,
              sdk,
              appKitSolanaProvider,
              hookProgress
            })

          // Return early since we already executed both transactions
          return {
            status: SwapStatus.SUCCESS,
            signature: intermediateAmount.finalSignature,
            inputAmount: intermediateAmount.inputAmount,
            outputAmount: intermediateAmount.outputAmount
          }
        } else {
          // Case 4: Non-artist coin swaps (Jupiter only)
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

          const decoded = Buffer.from(swapTx.swapTransaction, 'base64')
          transaction = VersionedTransaction.deserialize(
            new Uint8Array(decoded)
          )

          inputAmount = {
            amount: quote.inputAmount.amount,
            uiAmount: amountUi
          }
          outputAmount = {
            amount: quote.outputAmount.amount,
            uiAmount: quote.outputAmount.uiAmount
          }
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

        // Invalidate artist coin queries to refresh fee claiming and graduation progress
        if (params.inputMint && !isSpendingAudio) {
          queryClient.invalidateQueries({
            queryKey: getArtistCoinQueryKey(params.inputMint)
          })
        }
        if (params.outputMint && !isReceivingAudio) {
          queryClient.invalidateQueries({
            queryKey: getArtistCoinQueryKey(params.outputMint)
          })
        }
      }
    }
  })
}
