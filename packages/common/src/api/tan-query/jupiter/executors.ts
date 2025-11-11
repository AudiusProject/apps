import { FixedDecimal } from '@audius/fixed-decimal'
import { AudiusSdk } from '@audius/sdk'
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
  getCoinPoolState,
  getJupiterSwapInstructions,
  invalidateSwapQueries,
  prepareOutputUserBank,
  validateAndCreateTokenConfigs
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

// Unlike other methods, this can go either way but one of the mints must be AUDIO
async function executeMeteoraSwap(
  tokenMint: string, // Mint address of the token we're swapping (the one not AUDIO)
  swapDirection: 'audioToCoin' | 'coinToAudio',
  inputAmountUi: number,
  dependencies: {
    sdk: AudiusSdk
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

    // Which token are we swapping to? Artist coin for buys, audio for sells
    const inputTokenInfo =
      swapDirection === 'audioToCoin'
        ? tokenConfigsResult.outputTokenConfig // audio
        : tokenConfigsResult.inputTokenConfig // artist coin
    const outputTokenInfo =
      swapDirection === 'audioToCoin'
        ? tokenConfigsResult.inputTokenConfig // artist coin
        : tokenConfigsResult.outputTokenConfig // audio
    const inputTokenDecimals =
      swapDirection === 'audioToCoin' ? AUDIO_DECIMALS : TOKEN_DECIMALS
    const inputAmountFD = new FixedDecimal(inputAmountUi, inputTokenDecimals)

    // Transfer tokens from user bank to ATA (AUDIO for buys, artist coin for sells)
    const inputTokenAta = await addTransferFromUserBankInstructions({
      tokenInfo: inputTokenInfo,
      userPublicKey,
      ethAddress: ethAddress!,
      amountLamports: BigInt(inputAmountFD.value),
      sdk,
      feePayer,
      instructions
    })

    // Ensure user bank is prepared for receiving the tokens we're about to move (AUDIO for buys, artist coin for sells)
    const userBankResult =
      await sdk.services.claimableTokensClient.getOrCreateUserBank({
        ethWallet: ethAddress,
        mint: outputTokenInfo.claimableTokenMint
      })
    const destinationUserbank = userBankResult.userBank.toBase58()

    // Get the address for a temporary token account
    const tempOutputTokenAta = getAssociatedTokenAddressSync(
      new PublicKey(outputTokenInfo.mintAddress),
      userPublicKey,
      true
    )

    // Create the temporary token account for our artist coin
    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        feePayer,
        tempOutputTokenAta,
        userPublicKey,
        new PublicKey(outputTokenInfo.mintAddress)
      )
    )

    // Get dbc swap transaction
    const { transaction, outputAmount } =
      await sdk.services.solanaRelay.swapCoin({
        inputAmount: inputAmountFD.value.toString(),
        coinMint: tokenMint,
        swapDirection,
        userPublicKey,
        feePayer
      })
    const swapTx = VersionedTransaction.deserialize(
      Buffer.from(transaction, 'base64')
    )

    // Create a new transaction that combines our setup instructions with the swap instructions
    const connection = sdk.services.solanaClient.connection

    // Decompose the swap transaction to extract the DBC swap instruction
    const swapMessage = swapTx.message
    const accountKeys = swapMessage.staticAccountKeys

    // The TX here also contains some create ATA instrucitons but we're doing this manually and do not need them
    // We only need the DBC swap instruction - so we find it by it's program ID
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

    // Add the DBC swap instruction
    instructions.push(swapInstruction)

    // Transfer the output tokens from the temporary output token account to end user's user bank
    instructions.push(
      createTransferInstruction(
        tempOutputTokenAta,
        new PublicKey(destinationUserbank),
        userPublicKey,
        BigInt(outputAmount)
      )
    )

    // Resolve address lookup table accounts if present
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

    // Close the created ATA accounts (both input and output tokens)
    const atasToClose: PublicKey[] = [inputTokenAta, tempOutputTokenAta]

    for (const ataToClose of atasToClose) {
      instructions.push(
        createCloseAccountInstruction(ataToClose, feePayer, userPublicKey)
      )
    }

    // Build and send transaction
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
        amount: Number(inputAmountFD.value),
        uiAmount: inputAmountUi
      },
      outputAmount: {
        amount: Number(
          new FixedDecimal(outputAmount, outputTokenInfo.decimals).value
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
      // Execute first transaction with retries: InputToken -> AUDIO
      let swapToAudioRetryResult = await this.retryPolicy.executeWithRetry(
        inputHasPool ? swapToAudioWithMeteora : swapToAudioWithJupiter,
        async (_attemptNumber: number) => {
          // Invalidate queries before retry
          await this.invalidateQueries()
        }
      )

      // attempt to fallback to jupiter swap if meteora swap fails
      if (
        inputHasPool &&
        (!swapToAudioRetryResult.success || !swapToAudioRetryResult.result)
      ) {
        swapToAudioRetryResult = await this.retryPolicy.executeWithRetry(
          swapToAudioWithJupiter,
          async (_attemptNumber: number) => {
            // Invalidate queries before retry
            await this.invalidateQueries()
          }
        )
      }
      // throw if the first swap failed
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

      // Execute second transaction with retries: AUDIO -> OutputToken
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
        // Prioritize Meteora DBC swap if the token we're swapping is a DBC
        // @ts-ignore
        outputHasPool ? swapToTokenWithMeteora : swapToTokenWithJupiter,
        async (_attemptNumber: number) => {
          // Invalidate queries before retry
          await this.invalidateQueries()
        }
      )

      // attempt to fallback to jupiter swap if meteora swap fails
      if (
        outputHasPool &&
        (!swapToTokenResult.success || !swapToTokenResult.result)
      ) {
        swapToTokenResult = await this.retryPolicy.executeWithRetry(
          swapToTokenWithJupiter,
          async (_attemptNumber: number) => {
            // Invalidate queries before retry
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

  // Swap from any token -> AUDIO
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

      // Validate input token and create config
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

      // Create AUDIO token config
      errorStage = 'INDIRECT_SWAP_TO_AUDIO_AUDIO_CONFIG'
      const audioTokenInfo = createTokenConfig(
        findTokenByAddress(this.tokens, AUDIO_MINT)!
      )

      // Get quote: InputToken -> AUDIO
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

      // Prepare input token
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

      // Get/create AUDIO user bank
      errorStage = 'INDIRECT_SWAP_TO_AUDIO_PREPARE_AUDIO_USER_BANK'
      const audioUserBankResult =
        await sdk.services.claimableTokensClient.getOrCreateUserBank({
          ethWallet: ethAddress!,
          mint: audioTokenInfo.claimableTokenMint
        })
      const audioUserBank = audioUserBankResult.userBank

      // Get swap instructions (InputToken -> AUDIO)
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

      // Cleanup ATAs after first swap
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

      // Build and send first transaction
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

  // Swap from AUDIO -> any token
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

      // Validate output token config
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

      // Create AUDIO token config
      errorStage = 'INDIRECT_SWAP_AUDIO_TO_TOKEN_AUDIO_CONFIG'
      const audioTokenInfo = createTokenConfig(
        findTokenByAddress(this.tokens, AUDIO_MINT)!
      )

      // Query actual AUDIO balance from intermediate account
      errorStage = 'INDIRECT_SWAP_AUDIO_TO_TOKEN_QUERY_BALANCE'
      const actualAudioBalance = await this.getTokenBalance(
        swapToAudioResult.intermediateAudioAta,
        AUDIO_DECIMALS
      )

      // Validate we received a reasonable amount
      if (actualAudioBalance.uiAmount <= 0) {
        throw new Error(
          `Invalid AUDIO balance in intermediate account: ${actualAudioBalance.uiAmount}`
        )
      }
      // Use the predicted amount if we have enough, otherwise use actual balance
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

      // Get quote: AUDIO -> OutputToken
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

      // Transfer AUDIO from user bank to ATA for second swap
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

      // Prepare output destination
      errorStage = 'INDIRECT_SWAP_AUDIO_TO_TOKEN_PREPARE_OUTPUT'
      const preferredJupiterDestination = await prepareOutputUserBank(
        sdk,
        ethAddress!,
        outputTokenConfig
      )

      // Get swap instructions (AUDIO -> OutputToken)
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

      // Cleanup
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

      // Build and send second transaction
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
