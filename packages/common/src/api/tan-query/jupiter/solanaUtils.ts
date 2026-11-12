import type { AudiusSdkWithServices } from '@audius/sdk'
import { SwapInstructionsResponse, SwapRequest } from '@jup-ag/api'
import {
  createAssociatedTokenAccountIdempotentInstruction,
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

import { jupiterInstance } from '~/services/Jupiter'
import {
  INTERNAL_TRANSFER_MEMO_STRING,
  MEMO_PROGRAM_ID
} from '~/services/audius-backend/solana'
import { CoinInfo } from '~/store/ui/buy-sell/types'

import {
  ClaimableTokenMint,
  SwapErrorType,
  SwapStatus,
  SwapTokensResult,
  UserBankManagedTokenInfo
} from './types'
import { findTokenByAddress } from './utils'

/**
 * Solana instruction/transaction helpers for swaps. Kept separate from
 * ./utils so the light helpers can be used without loading @solana/web3.js.
 */

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
    await getAccount(await sdk.services.solanaClient.getConnection(), ata)
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

const SWAP_LOOKUP_TABLE_ADDRESS = new PublicKey(
  '2WB87JxGZieRd7hi3y87wq6HAsPLyb9zrSx8B5z1QEzM'
)

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
  sdk: AudiusSdkWithServices,
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
    const connection = await sdk.services.solanaClient.getConnection()
    await connection.confirmTransaction(signature, commitment)
  }

  return signature
}

export const prepareOutputUserBank = async (
  sdk: AudiusSdkWithServices,
  ethAddress: string,
  outputTokenConfig: UserBankManagedTokenInfo
): Promise<string> => {
  const result = await sdk.services.claimableTokensClient.getOrCreateUserBank({
    ethWallet: ethAddress,
    mint: outputTokenConfig.claimableTokenMint
  })
  return result.userBank.toBase58()
}
