import { USDC } from '@audius/fixed-decimal'
import type { AudiusSdk } from '@audius/sdk'
import { SwapRequest } from '@jup-ag/api'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync
} from '@solana/spl-token'
import type { Commitment, Keypair } from '@solana/web3.js'
import {
  PublicKey,
  TransactionInstruction,
  VersionedTransaction,
  Connection,
  MessageV0
} from '@solana/web3.js'
import { useQueryClient } from '@tanstack/react-query'

import type { User } from '~/models/User'
import {
  getJupiterQuoteByMintWithRetry,
  type JupiterMintQuoteParams
} from '~/services/Jupiter'
import {
  INTERNAL_TRANSFER_MEMO_STRING,
  MEMO_PROGRAM_ID
} from '~/services/audius-backend/solana'
import { CoinInfo } from '~/store/ui/buy-sell/types'

import { QUERY_KEYS } from '../queryKeys'

import {
  ClaimableTokenMint,
  SwapErrorType,
  SwapStatus,
  SwapTokensResult,
  UserBankManagedTokenInfo
} from './types'

const USDC_MINT_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

export async function addTransferFromUserBankInstructions({
  tokenInfo,
  userPublicKey,
  ethAddress,
  amountLamports,
  sdk,
  feePayer,
  instructions
}: {
  tokenInfo: UserBankManagedTokenInfo
  userPublicKey: PublicKey
  ethAddress: string
  amountLamports: bigint
  sdk: any
  feePayer: PublicKey
  instructions: TransactionInstruction[]
}): Promise<PublicKey> {
  const mint = new PublicKey(tokenInfo.mintAddress)
  const ata = getAssociatedTokenAddressSync(mint, userPublicKey, true)

  try {
    await getAccount(sdk.services.solanaClient.connection, ata)
  } catch (e) {
    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        feePayer,
        ata,
        userPublicKey,
        mint
      )
    )
  }

  const secpTransferInstruction =
    await sdk.services.claimableTokensClient.createTransferSecpInstruction({
      amount: amountLamports,
      ethWallet: ethAddress,
      mint: tokenInfo.claimableTokenMint,
      destination: ata,
      instructionIndex: instructions.length
    })
  const transferInstruction =
    await sdk.services.claimableTokensClient.createTransferInstruction({
      ethWallet: ethAddress,
      mint: tokenInfo.claimableTokenMint,
      destination: ata
    })

  instructions.push(secpTransferInstruction, transferInstruction)
  if (tokenInfo.mintAddress === USDC_MINT_ADDRESS) {
    instructions.push(
      new TransactionInstruction({
        keys: [{ pubkey: ata, isSigner: false, isWritable: true }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(INTERNAL_TRANSFER_MEMO_STRING)
      })
    )
  }
  return ata
}

export async function addTransferToUserBankInstructions({
  tokenInfo,
  userPublicKey,
  ethAddress,
  sourceAta,
  sdk,
  instructions
}: {
  tokenInfo: UserBankManagedTokenInfo
  userPublicKey: PublicKey
  ethAddress: string
  sourceAta: PublicKey
  sdk: AudiusSdk
  instructions: TransactionInstruction[]
}): Promise<PublicKey> {
  const mint = new PublicKey(tokenInfo.mintAddress)
  const userBankAddress =
    await sdk.services.claimableTokensClient.deriveUserBank({
      ethWallet: ethAddress,
      mint: tokenInfo.claimableTokenMint
    })

  // Get the current balance of the ATA
  const balance =
    await sdk.services.solanaClient.connection.getTokenAccountBalance(sourceAta)
  const amountLamports = BigInt(balance.value.amount)

  console.log('REED Transferring from ATA:', {
    sourceAta: sourceAta.toBase58(),
    userBankAddress: userBankAddress.toBase58(),
    balance: balance.value.amount,
    amountLamports: amountLamports.toString(),
    uiAmount: balance.value.uiAmount,
    decimals: tokenInfo.decimals
  })

  instructions.push(
    createTransferCheckedInstruction(
      sourceAta,
      mint,
      userBankAddress,
      userPublicKey,
      amountLamports,
      tokenInfo.decimals
    )
  )

  // Don't close the ATA in the same transaction as transfer
  // Let the cleanup logic handle closing empty ATAs separately
  return userBankAddress
}

/**
 * Creates an Associated Token Account (ATA) for Jupiter when shared accounts are not supported.
 * This is used as a fallback when Jupiter's shared account system fails for simple AMMs.
 *
 * @param tokenConfig - The token configuration containing mint address
 * @param userPublicKey - The user's public key
 * @param feePayer - The fee payer's public key
 * @param instructions - Array to push the ATA creation instruction to
 * @returns The created ATA public key
 */
export function addJupiterOutputAtaInstruction({
  tokenConfig,
  userPublicKey,
  feePayer,
  instructions
}: {
  tokenConfig: UserBankManagedTokenInfo
  userPublicKey: PublicKey
  feePayer: PublicKey
  instructions: TransactionInstruction[]
}): PublicKey {
  const outputAtaForJupiter = getAssociatedTokenAddressSync(
    new PublicKey(tokenConfig.mintAddress),
    userPublicKey,
    true
  )

  instructions.push(
    createAssociatedTokenAccountIdempotentInstruction(
      feePayer,
      outputAtaForJupiter,
      userPublicKey,
      new PublicKey(tokenConfig.mintAddress)
    )
  )

  return outputAtaForJupiter
}

/**
 * Get the appropriate error response for a swap error based on the error stage.
 */
export function getSwapErrorResponse(params: {
  errorStage: string
  error: Error
  inputAmount?: {
    amount: number
    uiAmount: number
  }
  outputAmount?: {
    amount: number
    uiAmount: number
  }
}) {
  const { errorStage, error, inputAmount, outputAmount } = params

  if (errorStage === 'QUOTE_RETRIEVAL') {
    return {
      status: SwapStatus.ERROR,
      error: {
        type: SwapErrorType.QUOTE_FAILED,
        message: error?.message ?? 'Failed to get swap quote'
      }
    }
  } else if (errorStage === 'INPUT_TOKEN_PREPARATION') {
    return {
      status: SwapStatus.ERROR,
      error: {
        type: SwapErrorType.BUILD_FAILED,
        message: `Failed to prepare input token: ${error.message}`
      },
      inputAmount,
      outputAmount
    }
  } else if (errorStage === 'TRANSACTION_BUILD') {
    return {
      status: SwapStatus.ERROR,
      error: {
        type: SwapErrorType.BUILD_FAILED,
        message: error?.message ?? 'Failed to build transaction'
      },
      inputAmount,
      outputAmount
    }
  } else if (errorStage === 'TRANSACTION_RELAY') {
    return {
      status: SwapStatus.ERROR,
      error: {
        type: SwapErrorType.RELAY_FAILED,
        message: error?.message ?? 'Failed to relay transaction'
      },
      inputAmount,
      outputAmount
    }
  } else {
    return {
      status: SwapStatus.ERROR,
      error: {
        type: SwapErrorType.UNKNOWN,
        message: error?.message ?? 'An unknown error occurred'
      }
    }
  }
}

/**
 * Formats a token price string using USDC formatting with custom decimal places.
 * This function preserves the original behavior for token price display.
 *
 * @param price - The price string to format
 * @param decimalPlaces - Number of decimal places to show
 * @returns Formatted price string
 */
export function formatTokenPrice(price: string, decimalPlaces: number): string {
  // USDC constructor uses 6 decimal places, so we need to constrain the display
  // to not exceed what's available in the FixedDecimal representation
  const maxDecimalPlaces = Math.min(decimalPlaces, 6)

  return USDC(price.replace(/,/g, '')).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimalPlaces
  })
}

const SWAP_LOOKUP_TABLE_ADDRESS = new PublicKey(
  '2WB87JxGZieRd7hi3y87wq6HAsPLyb9zrSx8B5z1QEzM'
)

export const findTokenByAddress = (
  tokens: Record<string, CoinInfo>,
  address: string
): CoinInfo | undefined => {
  return Object.values(tokens).find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  )
}

export const getClaimableTokenMint = (token: CoinInfo): ClaimableTokenMint => {
  if (token.symbol === 'USDC') return 'USDC'
  return new PublicKey(token.address)
}

export const createTokenConfig = (
  token: CoinInfo
): UserBankManagedTokenInfo => ({
  mintAddress: token.address,
  claimableTokenMint: getClaimableTokenMint(token),
  decimals: token.decimals
})

export const validateAndCreateTokenConfigs = (
  inputMintAddress: string,
  outputMintAddress: string,
  tokens: Record<string, CoinInfo>
):
  | {
      inputTokenConfig: UserBankManagedTokenInfo
      outputTokenConfig: UserBankManagedTokenInfo
    }
  | { error: SwapTokensResult } => {
  // Find input and output tokens
  const inputToken = findTokenByAddress(tokens, inputMintAddress)
  const outputToken = findTokenByAddress(tokens, outputMintAddress)

  if (!inputToken || !outputToken) {
    return {
      error: {
        status: SwapStatus.ERROR,
        error: {
          type: SwapErrorType.BUILD_FAILED,
          message: 'Token not found in available tokens'
        }
      }
    }
  }

  // Create token configs
  const inputTokenConfig = createTokenConfig(inputToken)
  const outputTokenConfig = createTokenConfig(outputToken)

  return { inputTokenConfig, outputTokenConfig }
}

export const getJupiterSwapInstructions = async (
  swapRequestParams: SwapRequest,
  outputTokenConfig?: UserBankManagedTokenInfo,
  _userPublicKey?: PublicKey,
  _feePayer?: PublicKey,
  _instructions?: TransactionInstruction[],
  inputTokenConfig?: UserBankManagedTokenInfo,
  connection?: Connection
): Promise<{
  transaction: VersionedTransaction
  outputAtaForJupiter?: PublicKey
}> => {
  let outputAtaForJupiter: PublicKey | undefined

  // Extract information from quoteResponse in SwapRequest
  const quoteResponse = swapRequestParams.quoteResponse

  // Check if we have a user public key to use as taker
  const hasTaker = !!swapRequestParams.userPublicKey

  if (!hasTaker) {
    // Without a taker, Ultra API won't provide a transaction
    // This is a required parameter for getting executable transactions
    throw new Error(
      'Cannot get swap transaction without taker. Ultra API requires taker (user public key) for transactions.'
    )
  }

  // Use Ultra API with taker to get complete transaction
  // Convert raw inAmount back to UI amount for the Ultra API call
  const rawAmount = BigInt(quoteResponse.inAmount)
  const uiAmount =
    Number(rawAmount) / Math.pow(10, inputTokenConfig?.decimals ?? 6)

  console.log('REED getJupiterSwapInstructions ultraParams:', {
    quoteResponseInAmount: quoteResponse.inAmount,
    rawAmount: rawAmount.toString(),
    inputDecimals: inputTokenConfig?.decimals ?? 6,
    calculatedUiAmount: uiAmount,
    inputTokenConfig
  })

  const ultraParams: Omit<JupiterMintQuoteParams, 'maxAccounts'> = {
    inputMint: quoteResponse.inputMint,
    outputMint: quoteResponse.outputMint,
    inputDecimals: inputTokenConfig?.decimals ?? 6, // Default to 6 if not provided
    outputDecimals: outputTokenConfig?.decimals ?? 6, // Default to 6 if not provided
    amountUi: uiAmount,
    slippageBps: quoteResponse.slippageBps,
    swapMode: quoteResponse.swapMode,
    onlyDirectRoutes: false, // Default to false, as this is typically not set in legacy requests
    taker: swapRequestParams.userPublicKey // Use the user public key as taker
  }

  // Get Ultra order which includes the complete transaction
  const quoteResult = await getJupiterQuoteByMintWithRetry(ultraParams)

  if (!quoteResult.quoteResult.order.transaction) {
    throw new Error(
      'Ultra API did not return a transaction despite having taker'
    )
  }

  // Decode the transaction from base64
  const transactionBuffer = Buffer.from(
    quoteResult.quoteResult.order.transaction,
    'base64'
  )
  const transaction = VersionedTransaction.deserialize(transactionBuffer)

  // Resolve Address Lookup Tables if present
  let resolvedMessage = transaction.message
  if (
    transaction.message.addressTableLookups &&
    transaction.message.addressTableLookups.length > 0
  ) {
    if (!connection) {
      throw new Error('Connection required to resolve Address Lookup Tables')
    }

    try {
      // Fetch lookup table accounts
      const lookupTableAccounts = await Promise.all(
        transaction.message.addressTableLookups.map(async (lookup) => {
          const account = await connection.getAddressLookupTable(
            lookup.accountKey
          )
          if (!account.value) {
            throw new Error(
              `Address Lookup Table ${lookup.accountKey.toBase58()} not found`
            )
          }
          return account.value
        })
      )

      // Try to resolve the address table lookups
      const loadedAddresses = (
        transaction.message as MessageV0
      ).resolveAddressTableLookups(lookupTableAccounts)

      // Create a new MessageV0 with loaded addresses
      resolvedMessage = new MessageV0({
        header: (transaction.message as MessageV0).header,
        staticAccountKeys: (transaction.message as MessageV0).staticAccountKeys,
        recentBlockhash: (transaction.message as MessageV0).recentBlockhash,
        compiledInstructions: (transaction.message as MessageV0)
          .compiledInstructions,
        addressTableLookups: [] // Empty since we're providing loaded addresses
      })

      // Manually set the loaded addresses (this is an internal property)
      Object.defineProperty(resolvedMessage, 'loadedAddresses', {
        value: loadedAddresses,
        writable: false
      })
    } catch (error) {
      console.error('Failed to resolve Address Lookup Tables:', error)
      // Fall back to using the original message - this may still fail but at least we tried
    }
  }

  // Return the transaction directly - no need for backward compatibility
  return { transaction, outputAtaForJupiter }
}

export const invalidateSwapQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  user: User
): Promise<void> => {
  // Invalidate user-specific queries
  if (user?.wallet) {
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.usdcBalance, user.wallet]
    })
  }

  // Invalidate general user coins query
  await queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.userCoins]
  })
}

export const prepareOutputUserBank = async (
  sdk: AudiusSdk,
  ethAddress: string,
  outputTokenConfig: UserBankManagedTokenInfo
): Promise<string> => {
  const result = await sdk.services.claimableTokensClient.getOrCreateUserBank({
    ethWallet: ethAddress,
    mint: outputTokenConfig.claimableTokenMint
  })
  return result.userBank.toBase58()
}

/**
 * Attempts to get a direct quote from Jupiter for the given token pair.
 * Returns true if a direct quote is available, false otherwise.
 */
export const isDirectRouteAvailable = async (
  inputMint: string,
  outputMint: string,
  amountUi: number,
  tokens: Record<string, CoinInfo>
): Promise<boolean> => {
  try {
    // Validate tokens and create configs
    const tokenConfigsResult = validateAndCreateTokenConfigs(
      inputMint,
      outputMint,
      tokens
    )

    if ('error' in tokenConfigsResult) {
      return false
    }

    const { inputTokenConfig, outputTokenConfig } = tokenConfigsResult

    // Try to get a direct quote
    await getJupiterQuoteByMintWithRetry({
      inputMint,
      outputMint,
      inputDecimals: inputTokenConfig.decimals,
      outputDecimals: outputTokenConfig.decimals,
      amountUi,
      swapMode: 'ExactIn',
      onlyDirectRoutes: false
    })

    return true
  } catch (error) {
    // If quote fails, there's no direct path available
    return false
  }
}

export const buildAndSendTransaction = async (
  sdk: AudiusSdk,
  keypair: Keypair,
  feePayer: PublicKey,
  instructions: TransactionInstruction[],
  addressLookupTableAddresses: string[],
  commitment?: Commitment
): Promise<string> => {
  // Build transaction
  const swapTx: VersionedTransaction =
    await sdk.services.solanaClient.buildTransaction({
      feePayer,
      instructions,
      addressLookupTables: addressLookupTableAddresses
        .map((addr: string) => new PublicKey(addr))
        .concat([SWAP_LOOKUP_TABLE_ADDRESS])
    })

  // Sign and send transaction
  swapTx.sign([keypair])
  const signature = await sdk.services.solanaClient.sendTransaction(swapTx)

  if (commitment) {
    await sdk.services.solanaClient.connection.confirmTransaction(
      signature,
      commitment
    )
  }

  return signature
}
