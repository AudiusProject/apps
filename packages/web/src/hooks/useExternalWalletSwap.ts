import {
  optimisticallyUpdateSwapBalances,
  useCurrentAccountUser,
  useQueryContext,
  getExternalWalletBalanceQueryKey,
  getFanClubQueryKey,
  SwapErrorType,
  SwapStatus,
  SwapTokensParams,
  SwapTokensResult,
  getConnectedWalletsQueryOptions
} from '@audius/common/api'
import {
  getJupiterQuoteByMintWithRetry,
  jupiterInstance
} from '@audius/common/src/services/Jupiter'
import { NON_FAN_CLUB_MINTS, TOKEN_LISTING_MAP } from '@audius/common/store'
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
  const swapRequest: SwapRequest = {
    quoteResponse: quote,
    userPublicKey: walletAddress,
    dynamicSlippage: true, // Uses the slippage from the quote
    useSharedAccounts: false
  }
  return await jupiterInstance.swapPost({ swapRequest })
}

const isFanClubMint = (mint: string): boolean => {
  return !NON_FAN_CLUB_MINTS.includes(mint)
}

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

  const secondSwapResult = await solanaRelay.swapCoin({
    inputAmount: audioOutputAmount,
    coinMint: outputMint,
    swapDirection: 'audioToCoin' as 'audioToCoin' | 'coinToAudio',
    userPublicKey: new PublicKey(walletAddress),
    isExternalWallet: true
  })

  const firstTx = VersionedTransaction.deserialize(
    new Uint8Array(Buffer.from(firstSwapResult.transaction, 'base64'))
  )
  const secondTx = VersionedTransaction.deserialize(
    new Uint8Array(Buffer.from(secondSwapResult.transaction, 'base64'))
  )

  const firstInstructions = extractInstructionsFromVersionedTx(firstTx)
  const secondInstructions = extractInstructionsFromVersionedTx(secondTx)

  const allInstructions = [...firstInstructions, ...secondInstructions]

  const { blockhash } = await solanaConnection.getLatestBlockhash()

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
  const isInputFanClub = isFanClubMint(inputMint)

  if (isInputFanClub) {
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
  const isInputAudio = inputMint === audioMint
  const isOutputAudio = outputMint === audioMint

  if (!isInputAudio && !isOutputAudio) {
    throw new Error(
      'Meteora swaps only support swaps between AUDIO and artist coins'
    )
  }

  const fanClubMint = isInputAudio ? outputMint : inputMint
  const swapDirection = isInputAudio ? 'audioToCoin' : 'coinToAudio'

  const rawInputAmount = BigInt(
    Math.floor(amountUi * Math.pow(10, inputDecimals))
  ).toString()

  await solanaRelay.getSwapCoinQuote({
    inputAmount: rawInputAmount,
    coinMint: fanClubMint,
    swapDirection: swapDirection as 'audioToCoin' | 'coinToAudio'
  })

  const swapResult = await solanaRelay.swapCoin({
    inputAmount: rawInputAmount,
    coinMint: fanClubMint,
    swapDirection: swapDirection as 'audioToCoin' | 'coinToAudio',
    userPublicKey: new PublicKey(walletAddress),
    isExternalWallet: true
  })

  const decoded = Buffer.from(swapResult.transaction, 'base64')
  const transaction = VersionedTransaction.deserialize(new Uint8Array(decoded))

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

        const isInputFanClub = isFanClubMint(inputMint)
        const isOutputFanClub = isFanClubMint(outputMint)
        const isInputAudio = inputMint === env.WAUDIO_MINT_ADDRESS
        const isOutputAudio = outputMint === env.WAUDIO_MINT_ADDRESS

        const isDirectMeteoraSwap =
          (isInputFanClub && isOutputAudio) || (isInputAudio && isOutputFanClub)

        const isBothFanClubs = isInputFanClub && isOutputFanClub
        const isMixedIndirectSwap =
          (isInputFanClub || isOutputFanClub) &&
          !isInputAudio &&
          !isOutputAudio &&
          !isBothFanClubs

        if (isDirectMeteoraSwap) {
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
        } else if (isBothFanClubs) {
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
            solanaConnection: await sdk.services.solanaClient.getConnection()
          })

          hookProgress.receivedQuote = true
          hookProgress.receivedSwapTx = true

          transaction = combinedResult.transaction
          inputAmount = combinedResult.inputAmount
          outputAmount = combinedResult.outputAmount
        } else if (isMixedIndirectSwap) {
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

          return {
            status: SwapStatus.SUCCESS,
            signature: intermediateAmount.finalSignature,
            inputAmount: intermediateAmount.inputAmount,
            outputAmount: intermediateAmount.outputAmount
          }
        } else {
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

        console.error(
          'External Wallet Swap Error',
          error instanceof Error ? error : new Error(errorMessage)
        )

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
      if (result.status === SwapStatus.SUCCESS) {
        optimisticallyUpdateSwapBalances(params, result, queryClient, user, env)

        if (user?.user_id) {
          queryClient.invalidateQueries({
            queryKey: getConnectedWalletsQueryOptions(
              { audiusSdk },
              { userId: user.user_id }
            ).queryKey
          })
        }

        const isSpendingAudio = params.inputMint === env.WAUDIO_MINT_ADDRESS
        const isReceivingAudio = params.outputMint === env.WAUDIO_MINT_ADDRESS
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
              const newAmount = Math.max(0, currentAmount - inputAmount)
              return new FixedDecimal(newAmount, oldBalance.decimalPlaces)
            }
          )
        }

        if (result.outputAmount && !isReceivingAudio) {
          queryClient.setQueryData(
            getExternalWalletBalanceQueryKey({
              walletAddress: params.walletAddress,
              mint: params.outputMint
            }),
            (oldBalance: FixedDecimal | undefined) => {
              if (!oldBalance) {
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

        if (params.inputMint && !isSpendingAudio) {
          queryClient.invalidateQueries({
            queryKey: getFanClubQueryKey(params.inputMint)
          })
        }
        if (params.outputMint && !isReceivingAudio) {
          queryClient.invalidateQueries({
            queryKey: getFanClubQueryKey(params.outputMint)
          })
        }
      }
    }
  })
}
