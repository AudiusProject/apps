import { FixedDecimal } from '@audius/fixed-decimal'
import { SwapRequest } from '@jup-ag/api'
import { createCloseAccountInstruction } from '@solana/spl-token'
import { PublicKey, TransactionInstruction } from '@solana/web3.js'

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
  SwapDependencies,
  SwapTokensParams,
  SwapStatus,
  SwapErrorType
} from './types'
import {
  addTransferFromUserBankInstructions,
  buildAndSendTransaction,
  createTokenConfig,
  findTokenByAddress,
  getJupiterSwapInstructions,
  invalidateSwapQueries,
  prepareOutputUserBank,
  validateAndCreateTokenConfigs
} from './utils'

const AUDIO_MINT = TOKEN_LISTING_MAP.AUDIO.address
const AUDIO_DECIMALS = TOKEN_LISTING_MAP.AUDIO.decimals

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

  /**
   * Queries the actual on-chain token balance for a given token account.
   * Returns the balance in both lamports (raw) and UI amount (with decimals applied).
   */
  protected async getTokenBalance(
    tokenAccount: PublicKey,
    decimals: number
  ): Promise<{ amount: string; uiAmount: number }> {
    const connection = this.dependencies.sdk.services.solanaClient.connection
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

    // Use FixedDecimal to ensure precise conversion from the string representation
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

      // Validate tokens and create configs
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

      // Get quote
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

      // Prepare input token
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

      // Prepare output destination
      errorStage = 'DIRECT_SWAP_PREPARE_OUTPUT'
      const preferredJupiterDestination = await prepareOutputUserBank(
        sdk,
        ethAddress!,
        outputTokenConfig
      )

      // Get swap instructions
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

      // Cleanup
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

      // Build and send transaction
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

export interface IndirectSwapStep1Result {
  firstQuote: JupiterQuoteResult
  signature: string
  intermediateAudioAta: PublicKey
}

export interface IndirectSwapStep2Result {
  signature: string
  secondQuote: JupiterQuoteResult
}

export class IndirectSwapExecutor extends BaseSwapExecutor {
  private retryPolicy: RetryPolicy = STANDARD_RETRY_POLICY

  async execute(params: SwapTokensParams): Promise<SwapExecutionResult> {
    try {
      // Execute first transaction with retries: InputToken -> AUDIO
      const step1RetryResult = await this.retryPolicy.executeWithRetry(
        async () => {
          return await this.executeStep1(params)
        },
        async (_attemptNumber: number) => {
          // Invalidate queries before retry
          await this.invalidateQueries()
        }
      )

      if (!step1RetryResult.success || !step1RetryResult.result) {
        return {
          status: SwapStatus.ERROR,
          error: {
            type: SwapErrorType.UNKNOWN,
            message: `Step 1 failed after ${step1RetryResult.attemptsMade} attempts: ${step1RetryResult.error?.message || 'Unknown error'}`
          }
        }
      }

      const step1Result = step1RetryResult.result

      // Execute second transaction with retries: AUDIO -> OutputToken
      const step2RetryResult = await this.retryPolicy.executeWithRetry(
        async () => {
          return await this.executeStep2(params, step1Result)
        },
        async (_attemptNumber: number) => {
          // Invalidate queries before retry
          await this.invalidateQueries()
        }
      )

      if (!step2RetryResult.success || !step2RetryResult.result) {
        return {
          status: SwapStatus.ERROR,
          error: {
            type: SwapErrorType.UNKNOWN,
            message: `Step 2 failed after ${step2RetryResult.attemptsMade} attempts: ${step2RetryResult.error?.message || 'Unknown error'}`
          }
        }
      }

      const step2Result = step2RetryResult.result

      return {
        status: SwapStatus.SUCCESS,
        signature: step2Result.signature,
        inputAmount: step1Result.firstQuote.inputAmount,
        outputAmount: step2Result.secondQuote.outputAmount
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

  async executeStep1(
    params: SwapTokensParams
  ): Promise<IndirectSwapStep1Result> {
    let errorStage = 'INDIRECT_SWAP_STEP1_UNKNOWN'

    try {
      const { inputMint: inputMintUiAddress, amountUi } = params
      const wrapUnwrapSol = params.wrapUnwrapSol ?? true

      const { sdk, keypair, userPublicKey, feePayer, ethAddress } =
        this.dependencies
      const instructions: TransactionInstruction[] = []

      // Validate input token and create config
      errorStage = 'INDIRECT_SWAP_STEP1_TOKEN_VALIDATION'
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

      // Create AUDIO token config
      errorStage = 'INDIRECT_SWAP_STEP1_AUDIO_CONFIG'
      const audioTokenInfo = createTokenConfig(
        findTokenByAddress(this.tokens, AUDIO_MINT)!
      )

      // Get quote: InputToken -> AUDIO
      errorStage = 'INDIRECT_SWAP_STEP1_QUOTE'
      const { quoteResult: firstQuote } = await getJupiterQuoteByMintWithRetry({
        inputMint: inputMintUiAddress,
        outputMint: AUDIO_MINT,
        inputDecimals: inputTokenConfig.decimals,
        outputDecimals: AUDIO_DECIMALS,
        amountUi,
        swapMode: 'ExactIn',
        onlyDirectRoutes: false
      })

      // Prepare input token
      errorStage = 'INDIRECT_SWAP_STEP1_PREPARE_INPUT'
      const sourceAtaForJupiter = await addTransferFromUserBankInstructions({
        tokenInfo: inputTokenConfig,
        userPublicKey,
        ethAddress: ethAddress!,
        amountLamports: BigInt(firstQuote.inputAmount.amountString),
        sdk,
        feePayer,
        instructions
      })

      // Get/create AUDIO user bank
      errorStage = 'INDIRECT_SWAP_STEP1_PREPARE_AUDIO_USER_BANK'
      const audioUserBankResult =
        await sdk.services.claimableTokensClient.getOrCreateUserBank({
          ethWallet: ethAddress!,
          mint: audioTokenInfo.claimableTokenMint
        })
      const audioUserBank = audioUserBankResult.userBank

      // Get swap instructions (InputToken -> AUDIO)
      errorStage = 'INDIRECT_SWAP_STEP1_SWAP_INSTRUCTIONS'
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

      // Cleanup ATAs after first swap
      errorStage = 'INDIRECT_SWAP_STEP1_CLEANUP'
      const firstAtasToClose: PublicKey[] = [sourceAtaForJupiter]
      if (firstOutputAtaForJupiter) {
        firstAtasToClose.push(firstOutputAtaForJupiter)
      }

      for (const ataToClose of firstAtasToClose) {
        instructions.push(
          createCloseAccountInstruction(ataToClose, feePayer, userPublicKey)
        )
      }

      // Build and send first transaction
      errorStage = 'INDIRECT_SWAP_STEP1_BUILD_AND_SEND'
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
        intermediateAudioAta: audioUserBank
      }
    } catch (error: unknown) {
      throw new Error(
        `Indirect swap step 1 failed at stage ${errorStage}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async executeStep2(
    params: SwapTokensParams,
    step1Result: IndirectSwapStep1Result
  ): Promise<IndirectSwapStep2Result> {
    let errorStage = 'INDIRECT_SWAP_STEP2_UNKNOWN'

    try {
      const { outputMint: outputMintUiAddress } = params
      const wrapUnwrapSol = params.wrapUnwrapSol ?? true

      const { sdk, keypair, userPublicKey, feePayer, ethAddress } =
        this.dependencies

      const instructions: TransactionInstruction[] = []

      // Validate output token config
      errorStage = 'INDIRECT_SWAP_STEP2_TOKEN_VALIDATION'
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

      // Create AUDIO token config
      errorStage = 'INDIRECT_SWAP_STEP2_AUDIO_CONFIG'
      const audioTokenInfo = createTokenConfig(
        findTokenByAddress(this.tokens, AUDIO_MINT)!
      )

      // Query actual AUDIO balance from intermediate account
      errorStage = 'INDIRECT_SWAP_STEP2_QUERY_BALANCE'
      const actualAudioBalance = await this.getTokenBalance(
        step1Result.intermediateAudioAta,
        AUDIO_DECIMALS
      )

      // Validate we received a reasonable amount
      if (actualAudioBalance.uiAmount <= 0) {
        throw new Error(
          `Invalid AUDIO balance in intermediate account: ${actualAudioBalance.uiAmount}`
        )
      }

      // Use the predicted amount if we have enough, otherwise use actual balance
      const predictedAmount = step1Result.firstQuote.outputAmount.uiAmount
      const predictedFixed = new FixedDecimal(predictedAmount, AUDIO_DECIMALS)
      const actualFixed = new FixedDecimal(
        actualAudioBalance.uiAmount,
        AUDIO_DECIMALS
      )
      const amountToSwap =
        predictedFixed.value <= actualFixed.value
          ? predictedAmount
          : actualAudioBalance.uiAmount

      // Get quote: AUDIO -> OutputToken
      errorStage = 'INDIRECT_SWAP_STEP2_QUOTE'
      const { quoteResult: secondQuote } = await getJupiterQuoteByMintWithRetry(
        {
          inputMint: AUDIO_MINT,
          outputMint: outputMintUiAddress,
          inputDecimals: AUDIO_DECIMALS,
          outputDecimals: outputTokenConfig.decimals,
          amountUi: amountToSwap,
          swapMode: 'ExactIn',
          onlyDirectRoutes: false
        }
      )

      // Transfer AUDIO from user bank to ATA for second swap
      errorStage = 'INDIRECT_SWAP_STEP2_PREPARE_AUDIO_INPUT'
      const audioSourceAtaForJupiter =
        await addTransferFromUserBankInstructions({
          tokenInfo: audioTokenInfo,
          userPublicKey,
          ethAddress: ethAddress!,
          amountLamports: BigInt(secondQuote.inputAmount.amountString),
          sdk,
          feePayer,
          instructions
        })

      // Prepare output destination
      errorStage = 'INDIRECT_SWAP_STEP2_PREPARE_OUTPUT'
      const preferredJupiterDestination = await prepareOutputUserBank(
        sdk,
        ethAddress!,
        outputTokenConfig
      )

      // Get swap instructions (AUDIO -> OutputToken)
      errorStage = 'INDIRECT_SWAP_STEP2_SWAP_INSTRUCTIONS'
      const secondSwapRequestParams: SwapRequest = {
        quoteResponse: secondQuote.quote,
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

      // Cleanup
      errorStage = 'INDIRECT_SWAP_STEP2_CLEANUP'
      const atasToClose: PublicKey[] = [audioSourceAtaForJupiter]
      if (outputAtaForJupiter) {
        atasToClose.push(outputAtaForJupiter)
      }

      for (const ataToClose of atasToClose) {
        instructions.push(
          createCloseAccountInstruction(ataToClose, feePayer, userPublicKey)
        )
      }

      // Build and send second transaction
      errorStage = 'INDIRECT_SWAP_STEP2_BUILD_AND_SEND'
      const signature = await buildAndSendTransaction(
        sdk,
        keypair,
        feePayer,
        instructions,
        swapInstructionsResult.addressLookupTableAddresses
      )

      return {
        signature,
        secondQuote
      }
    } catch (error: unknown) {
      throw new Error(
        `Indirect swap step 2 failed at stage ${errorStage}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
