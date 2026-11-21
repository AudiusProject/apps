import { FixedDecimal } from '@audius/fixed-decimal'
import type { AudiusSdkWithServices } from '@audius/sdk'
import { SwapRequest } from '@jup-ag/api'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync
} from '@solana/spl-token'
import {
  Keypair,
  PublicKey,
  TransactionInstruction,
  VersionedTransaction
} from '@solana/web3.js'

import {
  convertJupiterInstructions,
  getJupiterQuoteByMintWithRetry,
  JupiterQuoteResult
} from '~/services/Jupiter'
import { CoinInfo } from '~/store/ui/buy-sell/types'
import { TOKEN_LISTING_MAP } from '~/store/ui/shared/tokenConstants'
import { convertBigIntToAmountObject } from '~/utils'

import { RetryPolicy, STANDARD_RETRY_POLICY } from './retryPolicy'
import {
  addTransferFromUserBankInstructions,
  buildAndSendTransaction,
  createTokenConfig,
  getJupiterSwapInstructions,
  prepareOutputUserBank,
  validateAndCreateTokenConfigs
} from './solanaUtils'
import {
  SwapDependencies,
  SwapTokensParams,
  SwapStatus,
  SwapErrorType
} from './types'
import {
  findTokenByAddress,
  getCoinPoolState,
  invalidateSwapQueries
} from './utils'

const AUDIO_MINT = TOKEN_LISTING_MAP.AUDIO.address
const AUDIO_DECIMALS = TOKEN_LISTING_MAP.AUDIO.decimals
const TOKEN_DECIMALS = 9
const DBC_PROGRAM_ID = 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN'
const DAMM_V2_PROGRAM_ID = 'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG'

export interface SwapExecutionResult {
  status: SwapStatus
  signature?: string
  inputAmount?: {
    amount: number
    uiAmount: number
  }
  outputAmount?: {
    amount: number
    uiAmount: number
  }
  errorStage?: string
  error?: {
    type: SwapErrorType
    message: string
  }
}

async function executeMeteoraSwap(
  tokenMint: string, // Mint address of the token we're swapping (the one not AUDIO)
  swapDirection: 'audioToCoin' | 'coinToAudio',
  inputAmountUi: number,
  dependencies: {
    sdk: AudiusSdkWithServices
    userPublicKey: PublicKey
    keypair: Keypair
    ethAddress: string
    feePayer: PublicKey
    tokens: Record<string, CoinInfo>
  }
): Promise<SwapWithMeteoraDBCResult> {
  const { sdk, userPublicKey, keypair, ethAddress, feePayer, tokens } =
    dependencies
  const instructions: TransactionInstruction[] = []

  try {
    const tokenConfigsResult = validateAndCreateTokenConfigs(
      tokenMint,
      AUDIO_MINT,
      tokens
    )

    if ('error' in tokenConfigsResult) {
      throw new Error(
        `Output token validation failed: ${tokenConfigsResult.error.error?.message}`
      )
    }

    const inputTokenInfo =
      swapDirection === 'audioToCoin'
        ? tokenConfigsResult.outputTokenConfig
        : tokenConfigsResult.inputTokenConfig
    const outputTokenInfo =
      swapDirection === 'audioToCoin'
        ? tokenConfigsResult.inputTokenConfig
        : tokenConfigsResult.outputTokenConfig
    const inputTokenDecimals =
      swapDirection === 'audioToCoin' ? AUDIO_DECIMALS : TOKEN_DECIMALS
    const inputAmountFD = new FixedDecimal(inputAmountUi, inputTokenDecimals)

    const swapResult = await sdk.services.solanaRelay.swapCoin({
      inputAmount: inputAmountFD.value.toString(),
      coinMint: tokenMint,
      swapDirection,
      userPublicKey,
      feePayer
    })

    const { transaction, outputAmount, includedFeeInputAmount } = swapResult

    const transferAmount = includedFeeInputAmount
      ? BigInt(includedFeeInputAmount)
      : BigInt(inputAmountFD.value)

    const inputTokenAta = await addTransferFromUserBankInstructions({
      tokenInfo: inputTokenInfo,
      userPublicKey,
      ethAddress: ethAddress!,
      amountLamports: transferAmount,
      sdk,
      feePayer,
      instructions
    })

    const userBankResult =
      await sdk.services.claimableTokensClient.getOrCreateUserBank({
        ethWallet: ethAddress,
        mint: outputTokenInfo.claimableTokenMint
      })
    const destinationUserbank = userBankResult.userBank.toBase58()

    const tempOutputTokenAta = getAssociatedTokenAddressSync(
      new PublicKey(outputTokenInfo.mintAddress),
      userPublicKey,
      true
    )

    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        feePayer,
        tempOutputTokenAta,
        userPublicKey,
        new PublicKey(outputTokenInfo.mintAddress)
      )
    )

    const swapTx = VersionedTransaction.deserialize(
      Buffer.from(transaction, 'base64')
    )

    const connection = await sdk.services.solanaClient.getConnection()

    const swapMessage = swapTx.message
    const accountKeys = swapMessage.staticAccountKeys

    const poolSwapInstruction = swapMessage.compiledInstructions.find(
      (ix) =>
        accountKeys[ix.programIdIndex].toBase58() === DBC_PROGRAM_ID ||
        accountKeys[ix.programIdIndex].toBase58() === DAMM_V2_PROGRAM_ID
    )

    if (!poolSwapInstruction) {
      throw new Error('DBC swap instruction not found in transaction')
    }

    const swapInstruction: TransactionInstruction = {
      programId: accountKeys[poolSwapInstruction.programIdIndex],
      keys: poolSwapInstruction.accountKeyIndexes.map((index) => ({
        pubkey: accountKeys[index],
        isSigner: swapMessage.isAccountSigner(index),
        isWritable: swapMessage.isAccountWritable(index)
      })),
      data: Buffer.from(poolSwapInstruction.data)
    }

    instructions.push(swapInstruction)

    instructions.push(
      createTransferInstruction(
        tempOutputTokenAta,
        new PublicKey(destinationUserbank),
        userPublicKey,
        BigInt(outputAmount)
      )
    )

    const lookupTableAccounts = await Promise.all(
      swapMessage.addressTableLookups.map(async (lookup) => {
        const result = await connection.getAddressLookupTable(lookup.accountKey)
        return result.value
      })
    )
    const validLookupTableAccounts = lookupTableAccounts
      .filter(
        (account): account is NonNullable<typeof account> => account !== null
      )
      .map((account) => account.key.toBase58())

    const atasToClose: PublicKey[] = [inputTokenAta, tempOutputTokenAta]

    for (const ataToClose of atasToClose) {
      instructions.push(
        createCloseAccountInstruction(ataToClose, feePayer, userPublicKey)
      )
    }

    const signature = await buildAndSendTransaction(
      sdk,
      keypair,
      feePayer,
      instructions,
      validLookupTableAccounts
    )

    return {
      signature,
      status: SwapStatus.SUCCESS,
      firstQuote: {
        outputAmount: {
          uiAmount: Number(
            new FixedDecimal(
              BigInt(outputAmount),
              outputTokenInfo.decimals
            ).toString()
          )
        }
      },
      secondQuote: {
        outputAmount: {
          uiAmount: Number(
            new FixedDecimal(
              BigInt(outputAmount),
              outputTokenInfo.decimals
            ).toString()
          )
        }
      },
      intermediateAudioAta: new PublicKey(destinationUserbank),
      inputAmount: {
        amount: Number(transferAmount),
        uiAmount: Number(
          new FixedDecimal(transferAmount, inputTokenDecimals).toString()
        )
      },
      outputAmount: {
        amount: Number(
          new FixedDecimal(BigInt(outputAmount), outputTokenInfo.decimals).value
        ),
        uiAmount: Number(
          new FixedDecimal(
            BigInt(outputAmount),
            outputTokenInfo.decimals
          ).toString()
        )
      }
    }
  } catch (error: unknown) {
    throw new Error(
      `Meteora DBC swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
export abstract class BaseSwapExecutor {
  protected dependencies: SwapDependencies
  protected tokens: Record<string, CoinInfo>

  constructor(
    dependencies: SwapDependencies,
    tokens: Record<string, CoinInfo>
  ) {
    this.dependencies = dependencies
    this.tokens = tokens
  }

  abstract execute(params: SwapTokensParams): Promise<SwapExecutionResult>

  protected async invalidateQueries(): Promise<void> {
    await invalidateSwapQueries(
      this.dependencies.queryClient,
      this.dependencies.user
    )
  }

  protected async getTokenBalance(
    tokenAccount: PublicKey,
    decimals: number
  ): Promise<{ amount: string; uiAmount: number }> {
    const connection =
      await this.dependencies.sdk.services.solanaClient.getConnection()
    const balance = await connection.getTokenAccountBalance(
      tokenAccount,
      'confirmed'
    )

    if (!balance.value) {
      throw new Error(
        `Failed to get token account balance for ${tokenAccount.toBase58()}`
      )
    }

    const balanceAmount = convertBigIntToAmountObject(
      BigInt(balance.value.amount),
      decimals
    )

    const uiAmount =
      balance.value.uiAmount ??
      Number(
        new FixedDecimal(
          balanceAmount.uiAmountString,
          decimals
        ).value.toString()
      )

    return {
      amount: balance.value.amount,
      uiAmount
    }
  }
}

export class DirectSwapExecutor extends BaseSwapExecutor {
  async execute(params: SwapTokensParams): Promise<SwapExecutionResult> {
    const { hasPool: inputHasPool } = getCoinPoolState(
      params.inputMint,
      this.dependencies.queryClient
    )
    const { hasPool: outputHasPool } = getCoinPoolState(
      params.outputMint,
      this.dependencies.queryClient
    )
    if (inputHasPool || outputHasPool) {
      const swapDirection = inputHasPool ? 'coinToAudio' : 'audioToCoin'
      return await executeMeteoraSwap(
        swapDirection === 'coinToAudio' ? params.inputMint : params.outputMint,
        swapDirection,
        params.amountUi,
        {
          ...this.dependencies,
          tokens: this.tokens
        }
      )
    }
    return await this.executeDirectJupiterSwap(params)
  }

  async executeDirectJupiterSwap(
    params: SwapTokensParams
  ): Promise<SwapExecutionResult> {
    let errorStage = 'DIRECT_SWAP_UNKNOWN'

    try {
      const {
        inputMint: inputMintUiAddress,
        outputMint: outputMintUiAddress,
        amountUi
      } = params
      const wrapUnwrapSol = params.wrapUnwrapSol ?? true

      const { sdk, keypair, userPublicKey, feePayer, ethAddress } =
        this.dependencies

      const instructions: TransactionInstruction[] = []

      errorStage = 'DIRECT_SWAP_TOKEN_VALIDATION'
      const tokenConfigsResult = validateAndCreateTokenConfigs(
        inputMintUiAddress,
        outputMintUiAddress,
        this.tokens
      )

      if ('error' in tokenConfigsResult) {
        return {
          ...tokenConfigsResult.error,
          status: SwapStatus.ERROR,
          errorStage
        }
      }

      const { inputTokenConfig, outputTokenConfig } = tokenConfigsResult

      errorStage = 'DIRECT_SWAP_GET_QUOTE'
      const { quoteResult: quote } = await getJupiterQuoteByMintWithRetry({
        inputMint: inputMintUiAddress,
        outputMint: outputMintUiAddress,
        inputDecimals: inputTokenConfig.decimals,
        outputDecimals: outputTokenConfig.decimals,
        amountUi,
        swapMode: 'ExactIn',
        onlyDirectRoutes: false
      })

      errorStage = 'DIRECT_SWAP_PREPARE_INPUT'
      const sourceAtaForJupiter = await addTransferFromUserBankInstructions({
        tokenInfo: inputTokenConfig,
        userPublicKey,
        ethAddress: ethAddress!,
        amountLamports: BigInt(quote.inputAmount.amountString),
        sdk,
        feePayer,
        instructions
      })

      errorStage = 'DIRECT_SWAP_PREPARE_OUTPUT'
      const preferredJupiterDestination = await prepareOutputUserBank(
        sdk,
        ethAddress!,
        outputTokenConfig
      )

      errorStage = 'DIRECT_SWAP_GET_INSTRUCTIONS'
      const swapRequestParams: SwapRequest = {
        quoteResponse: quote.quote,
        userPublicKey: userPublicKey.toBase58(),
        destinationTokenAccount: preferredJupiterDestination,
        wrapAndUnwrapSol: wrapUnwrapSol,
        dynamicSlippage: true
      }

      const { swapInstructionsResult, outputAtaForJupiter } =
        await getJupiterSwapInstructions(
          swapRequestParams,
          outputTokenConfig,
          userPublicKey,
          feePayer,
          instructions
        )
      const { swapInstruction, addressLookupTableAddresses } =
        swapInstructionsResult

      const jupiterInstructions = convertJupiterInstructions([swapInstruction])
      instructions.push(...jupiterInstructions)

      errorStage = 'DIRECT_SWAP_CLEANUP'
      const atasToClose: PublicKey[] = []
      if (sourceAtaForJupiter) {
        atasToClose.push(sourceAtaForJupiter)
      }
      if (outputAtaForJupiter) {
        atasToClose.push(outputAtaForJupiter)
      }

      for (const ataToClose of atasToClose) {
        instructions.push(
          createCloseAccountInstruction(ataToClose, feePayer, userPublicKey)
        )
      }

      errorStage = 'DIRECT_SWAP_BUILD_TRANSACTION'
      const signature = await buildAndSendTransaction(
        sdk,
        keypair,
        feePayer,
        instructions,
        addressLookupTableAddresses
      )

      return {
        status: SwapStatus.SUCCESS,
        signature,
        inputAmount: quote.inputAmount,
        outputAmount: quote.outputAmount
      }
    } catch (error: unknown) {
      return {
        status: SwapStatus.ERROR,
        errorStage,
        error: {
          type: SwapErrorType.UNKNOWN,
          message: `Direct swap failed at stage ${errorStage}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }
    }
  }
}

export interface IndirectSwapToAudioResult {
  firstQuote: {
    outputAmount: {
      uiAmount: number
    }
  }
  signature: string
  intermediateAudioAta: PublicKey
  inputAmount: {
    amount: number
    uiAmount: number
  }
}

export interface SwapWithMeteoraDBCResult {
  status: SwapStatus
  firstQuote: {
    outputAmount: {
      uiAmount: number
    }
  }
  secondQuote: {
    outputAmount: {
      uiAmount: number
    }
  }
  signature: string
  intermediateAudioAta: PublicKey
  inputAmount: {
    amount: number
    uiAmount: number
  }
  outputAmount: {
    amount: number
    uiAmount: number
  }
}

export interface IndirectSwapToTokenResult {
  signature: string
  secondQuote: JupiterQuoteResult
  outputAmount: {
    amount: number
    uiAmount: number
  }
}

export class IndirectSwapExecutor extends BaseSwapExecutor {
  private retryPolicy: RetryPolicy = STANDARD_RETRY_POLICY

  async execute(params: SwapTokensParams): Promise<SwapExecutionResult> {
    try {
      const swapToAudioWithJupiter = async () => {
        return await this.executeJupiterSwapToAudio(params)
      }
      const swapToAudioWithMeteora = async () => {
        return await executeMeteoraSwap(
          params.inputMint,
          'coinToAudio',
          params.amountUi,
          { ...this.dependencies, tokens: this.tokens }
        )
      }
      const { hasPool: inputHasPool } = getCoinPoolState(
        params.inputMint,
        this.dependencies.queryClient
      )
      const { hasPool: outputHasPool } = getCoinPoolState(
        params.outputMint,
        this.dependencies.queryClient
      )
      let swapToAudioRetryResult = await this.retryPolicy.executeWithRetry(
        inputHasPool ? swapToAudioWithMeteora : swapToAudioWithJupiter,
        async (_attemptNumber: number) => {
          await this.invalidateQueries()
        }
      )

      if (
        inputHasPool &&
        (!swapToAudioRetryResult.success || !swapToAudioRetryResult.result)
      ) {
        swapToAudioRetryResult = await this.retryPolicy.executeWithRetry(
          swapToAudioWithJupiter,
          async (_attemptNumber: number) => {
            await this.invalidateQueries()
          }
        )
      }
      if (!swapToAudioRetryResult.success || !swapToAudioRetryResult.result) {
        return {
          status: SwapStatus.ERROR,
          error: {
            type: SwapErrorType.UNKNOWN,
            message: `Step 1 failed after ${swapToAudioRetryResult.attemptsMade} attempts: ${swapToAudioRetryResult.error?.message || 'Unknown error'}`
          }
        }
      }

      const swapToAudioResult = swapToAudioRetryResult.result

      const swapToTokenWithJupiter = async () =>
        await this.executeJupiterSwapToToken(params, swapToAudioResult)
      const swapToTokenWithMeteora = async () =>
        await executeMeteoraSwap(
          params.outputMint,
          'audioToCoin',
          swapToAudioResult.firstQuote.outputAmount.uiAmount,
          { ...this.dependencies, tokens: this.tokens }
        )

      let swapToTokenResult = await this.retryPolicy.executeWithRetry(
        // @ts-ignore
        outputHasPool ? swapToTokenWithMeteora : swapToTokenWithJupiter,
        async (_attemptNumber: number) => {
          await this.invalidateQueries()
        }
      )

      if (
        outputHasPool &&
        (!swapToTokenResult.success || !swapToTokenResult.result)
      ) {
        swapToTokenResult = await this.retryPolicy.executeWithRetry(
          swapToTokenWithJupiter,
          async (_attemptNumber: number) => {
            await this.invalidateQueries()
          }
        )
      }
      if (!swapToTokenResult.success || !swapToTokenResult.result) {
        return {
          status: SwapStatus.ERROR,
          error: {
            type: SwapErrorType.UNKNOWN,
            message: `Step 2 failed after both Jupiter and Meteora DBC swaps failed. DBC swap failed with error: ${swapToTokenResult.error?.message || 'Unknown error'}`
          }
        }
      }

      return {
        status: SwapStatus.SUCCESS,
        signature: swapToTokenResult.result.signature,
        inputAmount: swapToAudioResult.inputAmount,
        outputAmount: swapToTokenResult.result.outputAmount
      }
    } catch (error: unknown) {
      return {
        status: SwapStatus.ERROR,
        error: {
          type: SwapErrorType.UNKNOWN,
          message: `Indirect swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }
    }
  }

  async executeJupiterSwapToAudio(
    params: SwapTokensParams
  ): Promise<IndirectSwapToAudioResult> {
    let errorStage = 'INDIRECT_SWAP_TO_AUDIO_UNKNOWN'

    try {
      const { inputMint: inputMintUiAddress, amountUi } = params
      const wrapUnwrapSol = params.wrapUnwrapSol ?? true

      const { sdk, keypair, userPublicKey, feePayer, ethAddress } =
        this.dependencies
      const instructions: TransactionInstruction[] = []

      errorStage = 'INDIRECT_SWAP_TO_AUDIO_TOKEN_VALIDATION'
      const tokenConfigsResult = validateAndCreateTokenConfigs(
        inputMintUiAddress,
        AUDIO_MINT,
        this.tokens
      )

      if ('error' in tokenConfigsResult) {
        throw new Error(
          `Token validation failed: ${tokenConfigsResult.error.error?.message}`
        )
      }

      const { inputTokenConfig } = tokenConfigsResult

      errorStage = 'INDIRECT_SWAP_TO_AUDIO_AUDIO_CONFIG'
      const audioTokenInfo = createTokenConfig(
        findTokenByAddress(this.tokens, AUDIO_MINT)!
      )

      errorStage = 'INDIRECT_SWAP_TO_AUDIO_QUOTE'
      const { quoteResult: firstQuote } = await getJupiterQuoteByMintWithRetry({
        inputMint: inputMintUiAddress,
        outputMint: AUDIO_MINT,
        inputDecimals: inputTokenConfig.decimals,
        outputDecimals: AUDIO_DECIMALS,
        amountUi,
        swapMode: 'ExactIn',
        onlyDirectRoutes: false
      })

      errorStage = 'INDIRECT_SWAP_TO_AUDIO_PREPARE_INPUT'
      const sourceAtaForJupiter = await addTransferFromUserBankInstructions({
        tokenInfo: inputTokenConfig,
        userPublicKey,
        ethAddress: ethAddress!,
        amountLamports: BigInt(firstQuote.inputAmount.amountString),
        sdk,
        feePayer,
        instructions
      })

      errorStage = 'INDIRECT_SWAP_TO_AUDIO_PREPARE_AUDIO_USER_BANK'
      const audioUserBankResult =
        await sdk.services.claimableTokensClient.getOrCreateUserBank({
          ethWallet: ethAddress!,
          mint: audioTokenInfo.claimableTokenMint
        })
      const audioUserBank = audioUserBankResult.userBank

      errorStage = 'INDIRECT_SWAP_TO_AUDIO_SWAP_INSTRUCTIONS'
      const firstSwapRequestParams: SwapRequest = {
        quoteResponse: firstQuote.quote,
        userPublicKey: userPublicKey.toBase58(),
        destinationTokenAccount: audioUserBank.toBase58(),
        wrapAndUnwrapSol: wrapUnwrapSol,
        dynamicSlippage: true
      }

      const {
        swapInstructionsResult,
        outputAtaForJupiter: firstOutputAtaForJupiter
      } = await getJupiterSwapInstructions(
        firstSwapRequestParams,
        audioTokenInfo,
        userPublicKey,
        feePayer,
        instructions
      )

      const firstSwapInstructions = convertJupiterInstructions([
        swapInstructionsResult.swapInstruction
      ])
      instructions.push(...firstSwapInstructions)

      errorStage = 'INDIRECT_SWAP_TO_AUDIO_CLEANUP'
      const firstAtasToClose: PublicKey[] = [sourceAtaForJupiter]
      if (firstOutputAtaForJupiter) {
        firstAtasToClose.push(firstOutputAtaForJupiter)
      }

      for (const ataToClose of firstAtasToClose) {
        instructions.push(
          createCloseAccountInstruction(ataToClose, feePayer, userPublicKey)
        )
      }

      errorStage = 'INDIRECT_SWAP_TO_AUDIO_BUILD_AND_SEND'
      const signature = await buildAndSendTransaction(
        sdk,
        keypair,
        feePayer,
        instructions,
        swapInstructionsResult.addressLookupTableAddresses,
        'confirmed'
      )

      return {
        firstQuote,
        signature,
        intermediateAudioAta: audioUserBank,
        inputAmount: {
          amount: firstQuote.inputAmount.amount,
          uiAmount: firstQuote.inputAmount.uiAmount
        }
      }
    } catch (error: unknown) {
      throw new Error(
        `Indirect swap step 1 failed at stage ${errorStage}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async executeJupiterSwapToToken(
    params: SwapTokensParams,
    swapToAudioResult: IndirectSwapToAudioResult
  ): Promise<IndirectSwapToTokenResult> {
    let errorStage = 'INDIRECT_SWAP_AUDIO_TO_TOKEN_UNKNOWN'

    try {
      const { outputMint: outputMintUiAddress } = params
      const wrapUnwrapSol = params.wrapUnwrapSol ?? true

      const { sdk, keypair, userPublicKey, feePayer, ethAddress } =
        this.dependencies

      const instructions: TransactionInstruction[] = []

      errorStage = 'INDIRECT_SWAP_AUDIO_TO_TOKEN_VALIDATION'
      const tokenConfigsResult = validateAndCreateTokenConfigs(
        AUDIO_MINT,
        outputMintUiAddress,
        this.tokens
      )

      if ('error' in tokenConfigsResult) {
        throw new Error(
          `Output token validation failed: ${tokenConfigsResult.error.error?.message}`
        )
      }

      const { outputTokenConfig } = tokenConfigsResult

      errorStage = 'INDIRECT_SWAP_AUDIO_TO_TOKEN_AUDIO_CONFIG'
      const audioTokenInfo = createTokenConfig(
        findTokenByAddress(this.tokens, AUDIO_MINT)!
      )

      errorStage = 'INDIRECT_SWAP_AUDIO_TO_TOKEN_QUERY_BALANCE'
      const actualAudioBalance = await this.getTokenBalance(
        swapToAudioResult.intermediateAudioAta,
        AUDIO_DECIMALS
      )

      if (actualAudioBalance.uiAmount <= 0) {
        throw new Error(
          `Invalid AUDIO balance in intermediate account: ${actualAudioBalance.uiAmount}`
        )
      }
      const predictedAmount = swapToAudioResult.firstQuote.outputAmount.uiAmount
      const predictedFixed = new FixedDecimal(predictedAmount, AUDIO_DECIMALS)
      const actualFixed = new FixedDecimal(
        actualAudioBalance.uiAmount,
        AUDIO_DECIMALS
      )
      const amountToSwap =
        predictedFixed.value <= actualFixed.value
          ? predictedAmount
          : actualAudioBalance.uiAmount

      errorStage = 'INDIRECT_SWAP_AUDIO_TO_TOKEN_QUOTE'
      const { quoteResult: audioToTokenQuote } =
        await getJupiterQuoteByMintWithRetry({
          inputMint: AUDIO_MINT,
          outputMint: outputMintUiAddress,
          inputDecimals: AUDIO_DECIMALS,
          outputDecimals: outputTokenConfig.decimals,
          amountUi: amountToSwap,
          swapMode: 'ExactIn',
          onlyDirectRoutes: false
        })

      errorStage = 'INDIRECT_SWAP_AUDIO_TO_TOKEN_PREPARE_AUDIO_INPUT'
      const audioSourceAtaForJupiter =
        await addTransferFromUserBankInstructions({
          tokenInfo: audioTokenInfo,
          userPublicKey,
          ethAddress: ethAddress!,
          amountLamports: BigInt(audioToTokenQuote.inputAmount.amountString),
          sdk,
          feePayer,
          instructions
        })

      errorStage = 'INDIRECT_SWAP_AUDIO_TO_TOKEN_PREPARE_OUTPUT'
      const preferredJupiterDestination = await prepareOutputUserBank(
        sdk,
        ethAddress!,
        outputTokenConfig
      )

      errorStage = 'INDIRECT_SWAP_AUDIO_TO_TOKEN_SWAP_INSTRUCTIONS'
      const secondSwapRequestParams: SwapRequest = {
        quoteResponse: audioToTokenQuote.quote,
        userPublicKey: userPublicKey.toBase58(),
        destinationTokenAccount: preferredJupiterDestination,
        wrapAndUnwrapSol: wrapUnwrapSol,
        dynamicSlippage: true
      }

      const { swapInstructionsResult, outputAtaForJupiter } =
        await getJupiterSwapInstructions(
          secondSwapRequestParams,
          outputTokenConfig,
          userPublicKey,
          feePayer,
          instructions
        )

      const secondSwapInstructions = convertJupiterInstructions([
        swapInstructionsResult.swapInstruction
      ])
      instructions.push(...secondSwapInstructions)

      errorStage = 'INDIRECT_SWAP_AUDIO_TO_TOKEN_CLEANUP'
      const atasToClose: PublicKey[] = [audioSourceAtaForJupiter]
      if (outputAtaForJupiter) {
        atasToClose.push(outputAtaForJupiter)
      }

      for (const ataToClose of atasToClose) {
        instructions.push(
          createCloseAccountInstruction(ataToClose, feePayer, userPublicKey)
        )
      }

      errorStage = 'INDIRECT_SWAP_AUDIO_TO_TOKEN_BUILD_AND_SEND'
      const signature = await buildAndSendTransaction(
        sdk,
        keypair,
        feePayer,
        instructions,
        swapInstructionsResult.addressLookupTableAddresses
      )

      return {
        signature,
        secondQuote: audioToTokenQuote,
        outputAmount: {
          amount: audioToTokenQuote.outputAmount.amount,
          uiAmount: audioToTokenQuote.outputAmount.uiAmount
        }
      }
    } catch (error: unknown) {
      throw new Error(
        `Indirect swap step 2 failed at stage ${errorStage}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
