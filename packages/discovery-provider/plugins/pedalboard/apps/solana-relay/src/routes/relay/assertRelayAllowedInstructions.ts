import crypto from 'crypto'

import {
  ClaimableTokensProgram,
  RewardManagerProgram,
  Secp256k1Program,
  decodeAssociatedTokenAccountInstruction,
  isCreateAssociatedTokenAccountIdempotentInstruction,
  isCreateAssociatedTokenAccountInstruction
} from '@audius/spl'
import { Users } from '@pedalboard/storage'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  decodeInstruction,
  getAssociatedTokenAddressSync,
  isCloseAccountInstruction,
  isSyncNativeInstruction,
  isTransferCheckedInstruction,
  isTransferInstruction
} from '@solana/spl-token'
import {
  ComputeBudgetProgram,
  PublicKey,
  SystemInstruction,
  SystemProgram,
  TransactionInstruction
} from '@solana/web3.js'

import { config } from '../../config'
import { rateLimitTokenAccountCreation } from '../../redis'

import { InvalidRelayInstructionError } from './InvalidRelayInstructionError'
import { isUserAbusive } from './antiAbuse'
import { getAllowedMints } from './getAllowedMints'

const MEMO_PROGRAM_ID = 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo'
const DBC_PROGRAM_ID = 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN'
const DAMM_V2_PROGRAM_ID = 'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG'
const MEMO_V2_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
const PAYOUT_WALLET_MEMO = 'Payout Wallet'
const PREPARE_WITHDRAWAL_MEMO = 'Prepare Withdrawal'
const CLAIMABLE_TOKEN_PROGRAM_ID = config.claimableTokenProgramId
const REWARDS_MANAGER_PROGRAM_ID = config.rewardsManagerProgramId
const TRACK_LISTEN_COUNT_PROGRAM_ID = config.trackListenCountProgramId
const PAYMENT_ROUTER_PROGRAM_ID = config.paymentRouterProgramId
const JUPITER_AGGREGATOR_V6_PROGRAM_ID =
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'
const COINFLOW_PROGRAM_ID = 'FD1amxhTsDpwzoVX41dxp2ygAESURV2zdUACzxM1Dfw9'

const usdcMintAddress = config.usdcMintAddress

const REWARD_MANAGER = config.rewardsManagerAccountAddress

const PAYMENT_ROUTER_WALLET = PublicKey.findProgramAddressSync(
  [Buffer.from('payment_router')],
  new PublicKey(PAYMENT_ROUTER_PROGRAM_ID)
)[0]

const PAYMENT_ROUTER_USDC_TOKEN_ACCOUNT = getAssociatedTokenAddressSync(
  new PublicKey(usdcMintAddress),
  PAYMENT_ROUTER_WALLET,
  true
)

const findSpecificMemo = (
  instructions: TransactionInstruction[],
  memo: string
) => {
  for (const instruction of instructions) {
    if (
      instruction.programId.toBase58() === MEMO_PROGRAM_ID &&
      instruction.data.toString() === memo
    ) {
      return instruction.data.toString()
    }
  }
  return null
}

/**
 * Only allow the createTokenAccount instruction of the Associated Token
 * Account program, provided it has matching close instructions.
 * Close instructions are on the Token Programand are not validated here.
 */
const assertAllowedAssociatedTokenAccountProgramInstruction = async (
  instructionIndex: number,
  instruction: TransactionInstruction,
  instructions: TransactionInstruction[],
  user?: Pick<Users, 'wallet' | 'is_verified'> | null
) => {
  const { wallet, is_verified: isVerified } = user ?? {}
  const decodedInstruction =
    decodeAssociatedTokenAccountInstruction(instruction)
  if (
    isCreateAssociatedTokenAccountInstruction(decodedInstruction) ||
    isCreateAssociatedTokenAccountIdempotentInstruction(decodedInstruction)
  ) {
    const allowedMints = await getAllowedMints()
    allowedMints.push(
      NATIVE_MINT.toBase58() // Allow creating ATAs for SOL
    )
    const mintAddress = decodedInstruction.keys.mint.pubkey.toBase58()
    if (!allowedMints.includes(mintAddress)) {
      throw new InvalidRelayInstructionError(
        instructionIndex,
        `Mint not allowed for Associated Token Account program: ${mintAddress}`
      )
    }

    // Allow creating associated tokens for the Payment Router
    if (
      decodedInstruction.keys.owner.pubkey.toBase58() ===
      PAYMENT_ROUTER_WALLET.toBase58()
    ) {
      return
    }

    // Protect against feePayer drain by ensuring that there's always as
    // many account close instructions as creates
    const matchingCreateInstructions = instructions
      .filter((instr) => instr.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID))
      .map(decodeAssociatedTokenAccountInstruction)
      .filter(
        (instr) =>
          (isCreateAssociatedTokenAccountInstruction(instr) ||
            isCreateAssociatedTokenAccountIdempotentInstruction(instr)) &&
          decodedInstruction.keys.associatedToken.pubkey.equals(
            instr.keys.associatedToken.pubkey
          ) &&
          decodedInstruction.keys.payer.pubkey.equals(instr.keys.payer.pubkey)
      )
    const matchingCloseInstructions = instructions
      .filter((instr) => instr.programId.equals(TOKEN_PROGRAM_ID))
      .map((instr) => decodeInstruction(instr))
      .filter(
        (instr) =>
          isCloseAccountInstruction(instr) &&
          decodedInstruction.keys.associatedToken.pubkey.equals(
            instr.keys.account.pubkey
          ) &&
          decodedInstruction.keys.payer.pubkey.equals(
            instr.keys.destination.pubkey
          )
      )
    if (
      wallet &&
      matchingCreateInstructions.length !== matchingCloseInstructions.length
    ) {
      try {
        let memo: string | undefined
        if (findSpecificMemo(instructions, PAYOUT_WALLET_MEMO)) {
          memo = PAYOUT_WALLET_MEMO
        } else if (findSpecificMemo(instructions, PREPARE_WITHDRAWAL_MEMO)) {
          memo = PREPARE_WITHDRAWAL_MEMO
        }
        const isAbusive = await isUserAbusive(wallet)
        if (isAbusive) {
          throw new InvalidRelayInstructionError(
            instructionIndex,
            'User is abusive'
          )
        }
        // In this situation, we could be losing SOL because the user is allowed to
        // close their own ATA and reclaim the rent that we've fronted, so
        // rate limit it cautiously.
        await rateLimitTokenAccountCreation(wallet, !!isVerified, memo)
      } catch (e) {
        const error = e as Error
        throw new InvalidRelayInstructionError(instructionIndex, error.message)
      }
    } else if (
      matchingCreateInstructions.length !== matchingCloseInstructions.length
    ) {
      throw new InvalidRelayInstructionError(
        instructionIndex,
        `Mismatched number of create and close instructions for account: ${decodedInstruction.keys.associatedToken.pubkey.toBase58()}`
      )
    }
  } else {
    throw new InvalidRelayInstructionError(
      instructionIndex,
      'Unsupported Associated Token Program instruction'
    )
  }
}

/**
 * Allow normal transfers provided they are into userbanks, and allow
 * close account instructions and sync native (to unwrap wSOL) instructions.
 */
const assertAllowedTokenProgramInstruction = async (
  instructionIndex: number,
  instruction: TransactionInstruction,
  wallet?: string | null
) => {
  const decodedInstruction = decodeInstruction(instruction)
  if (
    isTransferCheckedInstruction(decodedInstruction) ||
    isTransferInstruction(decodedInstruction)
  ) {
    if (!wallet) {
      throw new InvalidRelayInstructionError(
        instructionIndex,
        `Transfer Checked requires authentication`
      )
    }
    const destination = decodedInstruction.keys.destination.pubkey
    const allowedMints = await getAllowedMints()
    const validUserbanks = await Promise.all(
      allowedMints.map(async (mint) => {
        const authority = ClaimableTokensProgram.deriveAuthority({
          programId: new PublicKey(CLAIMABLE_TOKEN_PROGRAM_ID),
          mint: new PublicKey(mint)
        })
        const userbank = await ClaimableTokensProgram.deriveUserBank({
          ethAddress: wallet,
          claimableTokensPDA: authority
        })
        return userbank
      })
    )
    validUserbanks.push(PAYMENT_ROUTER_USDC_TOKEN_ACCOUNT)

    // Check that destination is either a userbank or a payment router token account
    if (!validUserbanks.some((userbank) => userbank.equals(destination))) {
      throw new InvalidRelayInstructionError(
        instructionIndex,
        `Invalid destination account: ${destination.toBase58()}`
      )
    }
  } else if (
    !isCloseAccountInstruction(decodedInstruction) &&
    !isSyncNativeInstruction(decodedInstruction)
  ) {
    throw new InvalidRelayInstructionError(
      instructionIndex,
      'Unsupported Token Program instruction'
    )
  }
}

/**
 * Checks that the Reward Manager account on the Reward Manager program
 * matches the one in use on our deployed program.
 */
const assertAllowedRewardsManagerProgramInstruction = (
  instructionIndex: number,
  instruction: TransactionInstruction
) => {
  const decodedInstruction = RewardManagerProgram.decodeInstruction(instruction)
  const rewardManager =
    decodedInstruction.keys.rewardManagerState.pubkey.toBase58()
  if (rewardManager !== REWARD_MANAGER) {
    throw new InvalidRelayInstructionError(
      instructionIndex,
      `Invalid Reward Manager Account: ${rewardManager}`
    )
  }
}

/**
 * Checks that the claimable token program instruction uses one of the
 * allowed mints by checking the authority.
 */
const assertAllowedClaimableTokenProgramInstruction = async (
  instructionIndex: number,
  instruction: TransactionInstruction
) => {
  const decodedInstruction =
    ClaimableTokensProgram.decodeInstruction(instruction)
  const authority = decodedInstruction.keys.authority.pubkey
  const allowedMints = await getAllowedMints()
  const authorities = allowedMints.map((mint) =>
    ClaimableTokensProgram.deriveAuthority({
      programId: new PublicKey(CLAIMABLE_TOKEN_PROGRAM_ID),
      mint: new PublicKey(mint)
    })
  )
  if (!authorities.some((auth) => auth.equals(authority))) {
    throw new InvalidRelayInstructionError(
      instructionIndex,
      `Invalid Claimable Token Authority: ${authority}`
    )
  }
}

/**
 * Indexes of various accounts in a Jupiter V6 sharedAccountsRoute instruction.
 * https://github.com/jup-ag/jupiter-cpi/blob/main/idl.json
 */
const JupiterSharedSwapAccountIndex = {
  TOKEN_PROGRAM: 0,
  PROGRAM_AUTHORITY: 1,
  USER_TRANSFER_AUTHORITY: 2,
  SOURCE_TOKEN_ACCOUNT: 3,
  PROGRAM_SOURCE_TOKEN_ACCOUNT: 4,
  PROGRAM_DESTINATION_TOKEN_ACCOUNT: 5,
  DESTINATION_TOKEN_ACCOUNT: 6,
  SOURCE_MINT: 7,
  DESTINATION_MINT: 8,
  PLATFORM_FEE_ACCOUNT: 9,
  TOKEN_2022_PROGRAM: 10
}

/**
 * Indexes of various accounts in a Jupiter V6 route instruction.
 * https://github.com/jup-ag/jupiter-cpi/blob/main/idl.json
 */
const JupiterRouteAccountIndex = {
  TOKEN_PROGRAM: 0,
  USER_TRANSFER_AUTHORITY: 1,
  USER_SOURCE_TOKEN_ACCOUNT: 2,
  USER_DESTINATION_TOKEN_ACCOUNT: 3,
  DESTINATION_TOKEN_ACCOUNT: 4,
  DESTINATION_MINT: 5,
  PLATFORM_FEE_ACCOUNT: 6,
  EVENT_AUTHORITY: 7,
  PROGRAM: 8
}

export const computeInstructionDiscriminant = (
  instructionName: string
): Buffer => {
  const hash = crypto.createHash('sha256')
  hash.update(`global:${instructionName}`)
  return hash.digest().slice(0, 8)
}

export const JUPITER_ROUTE_DISCRIMINANT =
  computeInstructionDiscriminant('route')
export const JUPITER_SHARED_ACCOUNTS_ROUTE_DISCRIMINANT =
  computeInstructionDiscriminant('shared_accounts_route')

const getJupiterInstructionType = (
  instruction: TransactionInstruction
): 'route' | 'sharedAccountRoute' | 'unknown' => {
  if (instruction.data.length < 8) {
    return 'unknown'
  }

  const instructionDiscriminant = instruction.data.slice(0, 8)

  if (instructionDiscriminant.equals(JUPITER_ROUTE_DISCRIMINANT)) {
    return 'route'
  } else if (
    instructionDiscriminant.equals(JUPITER_SHARED_ACCOUNTS_ROUTE_DISCRIMINANT)
  ) {
    return 'sharedAccountRoute'
  }

  return 'unknown'
}

// Only allow swaps to SOL (for withdrawals) or USDC, AUDIO, or BONK (for userbank purchases)
const assertAllowedJupiterProgramInstruction = async (
  instructionIndex: number,
  instruction: TransactionInstruction,
  wallet?: string | null
) => {
  if (!wallet) {
    throw new InvalidRelayInstructionError(
      instructionIndex,
      'Jupiter Swap requires authentication'
    )
  }

  const instructionType = getJupiterInstructionType(instruction)
  if (instructionType === 'unknown') {
    throw new InvalidRelayInstructionError(
      instructionIndex,
      'Invalid Jupiter Program Instruction, Unknown Instruction Type'
    )
  }

  let sourceMint: string | null = null
  let destinationMint: string | null = null
  let userWallet: string | null = null

  try {
    if (instructionType === 'sharedAccountRoute') {
      // Handle shared_accounts_route instruction
      sourceMint =
        instruction.keys[
          JupiterSharedSwapAccountIndex.SOURCE_MINT
        ].pubkey.toBase58()
      destinationMint =
        instruction.keys[
          JupiterSharedSwapAccountIndex.DESTINATION_MINT
        ].pubkey.toBase58()
      userWallet =
        instruction.keys[
          JupiterSharedSwapAccountIndex.USER_TRANSFER_AUTHORITY
        ].pubkey.toBase58()
    } else if (instructionType === 'route') {
      // Handle route instruction
      destinationMint =
        instruction.keys[
          JupiterRouteAccountIndex.DESTINATION_MINT
        ].pubkey.toBase58()
      userWallet =
        instruction.keys[
          JupiterRouteAccountIndex.USER_TRANSFER_AUTHORITY
        ].pubkey.toBase58()

      // For route instructions, the source mint is not directly available in the accounts
      // It would need to be derived from the user's source token account via RPC call
      // For security and performance reasons, we skip source mint validation for route instructions
      // but still validate the destination mint and user authority
    }
  } catch (error) {
    throw new InvalidRelayInstructionError(
      instructionIndex,
      `Failed to parse Jupiter ${instructionType} instruction: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }

  const allowedMints = await getAllowedMints()
  allowedMints.push(
    NATIVE_MINT.toBase58() // Allow swaps to/from SOL
  )

  if (
    instructionType === 'sharedAccountRoute' &&
    sourceMint &&
    !allowedMints.includes(sourceMint)
  ) {
    throw new InvalidRelayInstructionError(
      instructionIndex,
      `Invalid source mint: ${sourceMint}`
    )
  }

  if (destinationMint && !allowedMints.includes(destinationMint)) {
    throw new InvalidRelayInstructionError(
      instructionIndex,
      `Invalid destination mint: ${destinationMint}`
    )
  }

  // Don't allow swaps on the feepayers
  const feePayerAddresses = config.solanaFeePayerWallets.map((kp) =>
    kp.publicKey.toBase58()
  )
  if (userWallet && feePayerAddresses?.includes(userWallet)) {
    throw new InvalidRelayInstructionError(
      instructionIndex,
      `Invalid transfer authority: ${userWallet}`
    )
  }
}

const assertAllowedSystemProgramInstruction = (
  instructionIndex: number,
  instruction: TransactionInstruction,
  wallet?: string | null,
  feePayer?: string
) => {
  if (!wallet) {
    throw new InvalidRelayInstructionError(
      instructionIndex,
      'System program requires authentication'
    )
  }
  if (!feePayer) {
    throw new InvalidRelayInstructionError(
      instructionIndex,
      'Invalid fee payer'
    )
  }
  const decodedInstructionType =
    SystemInstruction.decodeInstructionType(instruction)
  if (decodedInstructionType !== 'Transfer') {
    throw new InvalidRelayInstructionError(
      instructionIndex,
      'Invalid System Program Instruction'
    )
  } else {
    const decodedInstruction = SystemInstruction.decodeTransfer(instruction)
    if (decodedInstruction.fromPubkey.toBase58() === feePayer) {
      throw new InvalidRelayInstructionError(
        instructionIndex,
        'Invalid fromPubkey for transfer'
      )
    }
  }
}

const assertValidSecp256k1ProgramInstruction = (
  instructionIndex: number,
  instruction: TransactionInstruction
) => {
  const decoded = Secp256k1Program.decode(instruction)
  if (!Secp256k1Program.verifySignature(decoded)) {
    throw new InvalidRelayInstructionError(
      instructionIndex,
      'Invalid Secp256k1Program instruction'
    )
  }
}

/**
 * Checks each of the instructions to make sure it's something we want to relay.
 * The main goals of the checks are to ensure the feePayer isn't abused.
 * Major checks include:
 * - Checking the caller is interacting with our deployed versions of the programs
 * - Checking the caller isn't creating token accounts that can be rent-drained
 * - Checking the caller isn't interacting with non-Audius related programs
 * @param instructions the instructions to check
 * @param user the user, if signed in
 * @param socialProofEnabled if social proof is enabled
 * @throws {InvalidRelayInstructionError} if the instruction isn't supported
 */
export const assertRelayAllowedInstructions = async (
  instructions: TransactionInstruction[],
  options?: {
    user?: Pick<Users, 'wallet' | 'is_verified'>
    feePayer?: string
  }
) => {
  for (let i = 0; i < instructions.length; i++) {
    const instruction = instructions[i]
    switch (instruction.programId.toBase58()) {
      case ASSOCIATED_TOKEN_PROGRAM_ID.toBase58():
        await assertAllowedAssociatedTokenAccountProgramInstruction(
          i,
          instruction,
          instructions,
          options?.user
        )
        break
      case TOKEN_PROGRAM_ID.toBase58():
        await assertAllowedTokenProgramInstruction(
          i,
          instruction,
          options?.user?.wallet
        )
        break
      case REWARDS_MANAGER_PROGRAM_ID:
        assertAllowedRewardsManagerProgramInstruction(i, instruction)
        break
      case CLAIMABLE_TOKEN_PROGRAM_ID:
        await assertAllowedClaimableTokenProgramInstruction(i, instruction)
        break
      case JUPITER_AGGREGATOR_V6_PROGRAM_ID:
        await assertAllowedJupiterProgramInstruction(
          i,
          instruction,
          options?.user?.wallet
        )
        break
      case SystemProgram.programId.toBase58():
        assertAllowedSystemProgramInstruction(
          i,
          instruction,
          options?.user?.wallet,
          options?.feePayer
        )
        break
      case Secp256k1Program.programId.toBase58():
        assertValidSecp256k1ProgramInstruction(i, instruction)
        break
      case PAYMENT_ROUTER_PROGRAM_ID:
      case DBC_PROGRAM_ID:
      case DAMM_V2_PROGRAM_ID:
      case MEMO_PROGRAM_ID:
      case MEMO_V2_PROGRAM_ID:
      case TRACK_LISTEN_COUNT_PROGRAM_ID:
      case ComputeBudgetProgram.programId.toBase58():
      case COINFLOW_PROGRAM_ID:
        // All instructions of these programs are allowed
        break
      default:
        throw new InvalidRelayInstructionError(
          i,
          `Unknown Program: ${instruction.programId.toBase58()}`
        )
    }
  }
}
