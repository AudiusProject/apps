import { USDC } from '@audius/fixed-decimal'
import type { AudiusSdk } from '@audius/sdk'
import { SwapInstructionsResponse, SwapRequest } from '@jup-ag/api'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync
} from '@solana/spl-token'
import {
  Commitment,
  Keypair,
  PublicKey,
  TransactionInstruction,
  VersionedTransaction
} from '@solana/web3.js'
import { QueryClient, useQueryClient } from '@tanstack/react-query'

import type { User } from '~/models/User'
import {
  getJupiterQuoteByMintWithRetry,
  jupiterInstance
} from '~/services/Jupiter'
import {
  INTERNAL_TRANSFER_MEMO_STRING,
  MEMO_PROGRAM_ID
} from '~/services/audius-backend/solana'
import { CoinInfo } from '~/store/ui/buy-sell/types'
import {
  AUDIO_MINT,
  NON_ARTIST_COIN_MINTS
} from '~/store/ui/shared/tokenConstants'

import { getArtistCoinQueryKey } from '../coins'
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
  amountLamports,
  sourceAta,
  sdk,
  feePayer,
  instructions
}: {
  tokenInfo: UserBankManagedTokenInfo
  userPublicKey: PublicKey
  ethAddress: string
  amountLamports: bigint
  sourceAta: PublicKey
  sdk: AudiusSdk
  feePayer: PublicKey
  instructions: TransactionInstruction[]
}): Promise<PublicKey> {
  const mint = new PublicKey(tokenInfo.mintAddress)
  const userBankAddress =
    await sdk.services.claimableTokensClient.deriveUserBank({
      ethWallet: ethAddress,
      mint: tokenInfo.claimableTokenMint
    })

  instructions.push(
    createTransferCheckedInstruction(
      sourceAta,
      mint,
      userBankAddress,
      userPublicKey,
      amountLamports,
      tokenInfo.decimals
    ),
    createCloseAccountInstruction(sourceAta, feePayer, userPublicKey)
  )
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
  userPublicKey?: PublicKey,
  feePayer?: PublicKey,
  instructions?: TransactionInstruction[]
): Promise<{
  swapInstructionsResult: SwapInstructionsResponse
  outputAtaForJupiter?: PublicKey
}> => {
  let swapInstructionsResult
  let outputAtaForJupiter: PublicKey | undefined

  try {
    swapInstructionsResult = await jupiterInstance.swapInstructionsPost({
      swapRequest: {
        ...swapRequestParams,
        useSharedAccounts: true
      }
    })
  } catch (e) {
    swapInstructionsResult = await jupiterInstance.swapInstructionsPost({
      swapRequest: {
        ...swapRequestParams,
        useSharedAccounts: false
      }
    })

    // Add output ATA instruction if fallback is used and all required params are provided
    if (outputTokenConfig && userPublicKey && feePayer && instructions) {
      outputAtaForJupiter = addJupiterOutputAtaInstruction({
        tokenConfig: outputTokenConfig,
        userPublicKey,
        feePayer,
        instructions
      })
    }
  }

  return { swapInstructionsResult, outputAtaForJupiter }
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
  @deprecated - We're moving away from Jupiter as the SO for stuff - use getIsDirectSwappable instead + meteora quotes if needed
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

/**
 * Checks if a swap is direct swappable between two tokens.
 * @param inputMint - The input mint address
 * @param outputMint - The output mint address
 * @returns True if the swap is direct swappable, false otherwise
 */
export const getIsDirectSwappable = (
  inputMint: string,
  outputMint: string
): boolean => {
  // Check for direct swaps for non-artist coins
  if (
    NON_ARTIST_COIN_MINTS.includes(inputMint) &&
    NON_ARTIST_COIN_MINTS.includes(outputMint)
  ) {
    return true
  }
  // At this point we know one of our mints is an artist coin - so to be a direct swap, the other mint must be AUDIO
  return inputMint === AUDIO_MINT || outputMint === AUDIO_MINT
}

/**
 * Checks for pool
 * @param mint - The mint address of the coin
 * @param queryClient
 * @returns { isDBC: boolean; isDAMM: boolean } - Whether the coin is a DBC or DAMM
 */
export const getCoinPoolState = (
  mint: string,
  queryClient: QueryClient
): { isDBC: boolean; isDAMM: boolean } => {
  if (NON_ARTIST_COIN_MINTS.includes(mint)) {
    return {
      isDBC: false,
      isDAMM: false
    }
  }
  const coinInfo = queryClient.getQueryData(getArtistCoinQueryKey(mint))
  return {
    isDBC: coinInfo?.dynamicBondingCurve?.isMigrated === false,
    isDAMM: coinInfo?.dynamicBondingCurve?.isMigrated === true
  }
}
