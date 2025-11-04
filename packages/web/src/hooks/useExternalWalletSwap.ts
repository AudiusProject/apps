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
  solanaRelay: any
}

type MeteoraSwapParams = BaseSwapParams & {
  inputMint: string
  outputMint: string
  inputDecimals: number
  outputDecimals: number
  amountUi: number
  audioMint: string
  audioDecimals: number
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
  solanaConnection,
  solanaRelay
}: IndirectSwapParams): Promise<{
  transaction: VersionedTransaction
  inputAmount: SwapAmount
  outputAmount: SwapAmount
}> => {
  // Check if we should use Meteora for each leg
  const isInputArtistCoin = isArtistCoinMint(inputMint)
  const isOutputArtistCoin = isArtistCoinMint(outputMint)

  let firstLegTransaction: string
  let firstLegOutputAmountRaw: string
  let firstLegOutputAmountUi: number
  let firstLegInputAmountRaw: string

  // First leg: input -> AUDIO
  if (isInputArtistCoin) {
    // Use Meteora for artist coin -> AUDIO
    const rawInputAmount = BigInt(
      Math.floor(amountUi * Math.pow(10, inputDecimals))
    ).toString()

    const swapResult = await solanaRelay.swapCoin({
      inputAmount: rawInputAmount,
      coinMint: inputMint,
      swapDirection: 'coinToAudio' as 'audioToCoin' | 'coinToAudio',
      userPublicKey: new PublicKey(walletAddress),
      isExternalWallet: true
    })

    firstLegTransaction = swapResult.transaction
    firstLegOutputAmountRaw = swapResult.outputAmount
    firstLegOutputAmountUi =
      Number(BigInt(swapResult.outputAmount)) / Math.pow(10, audioDecimals)
    firstLegInputAmountRaw = rawInputAmount
  } else {
    // Use Jupiter for non-artist coin -> AUDIO
    const { quoteResult: firstQuote } = await getJupiterQuoteByMintWithRetry({
      inputMint,
      outputMint: audioMint,
      inputDecimals,
      outputDecimals: audioDecimals,
      amountUi,
      swapMode: 'ExactIn',
      onlyDirectRoutes: false
    })

    const swapTx = await getDirectSwapTx(firstQuote.quote, walletAddress)
    firstLegTransaction = swapTx.swapTransaction
    firstLegOutputAmountRaw = firstQuote.outputAmount.amount.toString()
    firstLegOutputAmountUi = firstQuote.outputAmount.uiAmount
    firstLegInputAmountRaw = firstQuote.inputAmount.amount.toString()
  }

  // Second leg: AUDIO -> output (using first leg's output as input)
  let secondLegTransaction: string
  let secondLegOutputAmountRaw: string
  let secondLegOutputAmountUi: number

  if (isOutputArtistCoin) {
    // Use Meteora for AUDIO -> artist coin
    const swapResult = await solanaRelay.swapCoin({
      inputAmount: firstLegOutputAmountRaw,
      coinMint: outputMint,
      swapDirection: 'audioToCoin' as 'audioToCoin' | 'coinToAudio',
      userPublicKey: new PublicKey(walletAddress),
      isExternalWallet: true
    })

    secondLegTransaction = swapResult.transaction
    secondLegOutputAmountRaw = swapResult.outputAmount
    secondLegOutputAmountUi =
      Number(BigInt(swapResult.outputAmount)) / Math.pow(10, outputDecimals)
  } else {
    // Use Jupiter for AUDIO -> non-artist coin
    const { quoteResult: secondQuote } = await getJupiterQuoteByMintWithRetry({
      inputMint: audioMint,
      outputMint,
      inputDecimals: audioDecimals,
      outputDecimals,
      amountUi: firstLegOutputAmountUi,
      swapMode: 'ExactIn',
      onlyDirectRoutes: false
    })

    const swapTx = await getDirectSwapTx(secondQuote.quote, walletAddress)
    secondLegTransaction = swapTx.swapTransaction
    secondLegOutputAmountRaw = secondQuote.outputAmount.amount.toString()
    secondLegOutputAmountUi = secondQuote.outputAmount.uiAmount
  }

  // Deserialize both transactions
  const firstTx = VersionedTransaction.deserialize(
    new Uint8Array(Buffer.from(firstLegTransaction, 'base64'))
  )
  const secondTx = VersionedTransaction.deserialize(
    new Uint8Array(Buffer.from(secondLegTransaction, 'base64'))
  )

  // Combine instructions from both transactions
  const allInstructions: TransactionInstruction[] = [
    ...firstTx.message.compiledInstructions.map((ix) => ({
      programId: firstTx.message.staticAccountKeys[ix.programIdIndex],
      keys: ix.accountKeyIndexes.map((keyIndex) => ({
        pubkey: firstTx.message.staticAccountKeys[keyIndex],
        isSigner: firstTx.message.isAccountSigner(keyIndex),
        isWritable: firstTx.message.isAccountWritable(keyIndex)
      })),
      data: Buffer.from(ix.data)
    })),
    ...secondTx.message.compiledInstructions.map((ix) => ({
      programId: secondTx.message.staticAccountKeys[ix.programIdIndex],
      keys: ix.accountKeyIndexes.map((keyIndex) => ({
        pubkey: secondTx.message.staticAccountKeys[keyIndex],
        isSigner: secondTx.message.isAccountSigner(keyIndex),
        isWritable: secondTx.message.isAccountWritable(keyIndex)
      })),
      data: Buffer.from(ix.data)
    }))
  ]

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
      amount: Number(BigInt(firstLegInputAmountRaw)),
      uiAmount: amountUi
    },
    outputAmount: {
      amount: Number(BigInt(secondLegOutputAmountRaw)),
      uiAmount: secondLegOutputAmountUi
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

/**
 * Checks if a mint is an artist coin (not in NON_ARTIST_COIN_MINTS)
 */
const isArtistCoinMint = (mint: string): boolean => {
  return !NON_ARTIST_COIN_MINTS.includes(mint)
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

        // Use Meteora for direct swaps between AUDIO and artist coins
        // For artist-coin to artist-coin, we need an indirect swap through AUDIO
        const isDirectMeteoraSwap =
          (isInputArtistCoin && isOutputAudio) ||
          (isInputAudio && isOutputArtistCoin)

        if (isDirectMeteoraSwap) {
          // Direct Meteora swap: AUDIO ↔ artist-coin
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
        } else if (isInputArtistCoin || isOutputArtistCoin) {
          // Indirect swap through AUDIO (artist-coin → AUDIO → artist-coin, or artist-coin → AUDIO → other token)
          const indirectResult = await getIndirectSwapTx({
            inputMint,
            outputMint,
            audioMint: env.WAUDIO_MINT_ADDRESS,
            inputDecimals,
            outputDecimals,
            audioDecimals: TOKEN_LISTING_MAP.AUDIO.decimals,
            amountUi,
            walletAddress,
            solanaConnection: sdk.services.solanaClient.connection,
            solanaRelay: sdk.services.solanaRelay
          })

          hookProgress.receivedQuote = true
          hookProgress.receivedSwapTx = true

          transaction = indirectResult.transaction
          inputAmount = indirectResult.inputAmount
          outputAmount = indirectResult.outputAmount
        } else {
          // Use Jupiter for non-artist coin swaps
          // Try direct swap first, fall back to indirect swap through AUDIO if it fails
          try {
            // Get jupiter quote first (allow indirect routes through AUDIO for DBC swaps)
            const { quoteResult: quote } = await getJupiterQuoteByMintWithRetry(
              {
                inputMint,
                outputMint,
                inputDecimals,
                outputDecimals,
                amountUi,
                swapMode: 'ExactIn',
                onlyDirectRoutes: false
              }
            )

            hookProgress.receivedQuote = true

            const swapTx = await getDirectSwapTx(quote.quote, walletAddress)
            hookProgress.receivedSwapTx = true

            // Deserialize the base64-encoded transaction
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
              solanaConnection: sdk.services.solanaClient.connection,
              solanaRelay: sdk.services.solanaRelay
            })

            hookProgress.receivedQuote = true
            hookProgress.receivedSwapTx = true

            transaction = indirectResult.transaction
            inputAmount = indirectResult.inputAmount
            outputAmount = indirectResult.outputAmount
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
