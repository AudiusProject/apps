import type { AuthorityType } from '@solana/spl-token'
import type { AccountMeta, PublicKey } from '@solana/web3.js'

import type { ClaimableTokensInstruction } from './constants'

export type CreateClaimableTokensAccountParams = {
  /** The user's Ethereum wallet address. */
  ethAddress: string
  /** The account used to pay for the user bank creation. */
  payer: PublicKey
  /** The token mint of user bank. */
  mint: PublicKey
  /** The PDA owner of all user banks for the given mint and program ID. */
  authority: PublicKey
  /** The user bank account to create. */
  userBank: PublicKey
  /** The programId of the Claimable Tokens Program. */
  programId?: PublicKey
  /** The programId of the SPL Token Program. */
  tokenProgramId?: PublicKey
}

export type CreateClaimableTokensAccountInstructionData = {
  /** The instruction identifier. */
  instruction: ClaimableTokensInstruction.Create
  /** The user's Ethereum wallet address. */
  ethAddress: string
}

export type DecodedCreateClaimableTokensAccountInstruction = {
  programId: PublicKey
  keys: {
    /** The account used to pay for the user bank creation. */
    payer: AccountMeta
    /** The token mint of user bank. */
    mint: AccountMeta
    /** The PDA owner of all user banks for the given mint and program ID. */
    authority: AccountMeta
    /** The user bank account to create. */
    userBank: AccountMeta
    /** The rent sysvar account. */
    rent: AccountMeta
    /** The programId of the SPL Token Program. */
    tokenProgramId: AccountMeta
    /** The programId of System Program. */
    systemProgramId: AccountMeta
  }
  data: CreateClaimableTokensAccountInstructionData
}

export type TransferClaimableTokensParams = {
  /** The account used to pay for the transfer. */
  payer: PublicKey
  /** The sending user's Ethereum wallet address. */
  sourceEthAddress: string
  /** The sending user's user bank account. */
  sourceUserBank: PublicKey
  /** The destination token account. */
  destination: PublicKey
  /** The nonce account, used to prevent double spends. */
  nonceAccount: PublicKey
  /** The PDA owner of all user banks for the given mint and program ID */
  authority: PublicKey
  /** The programId of the Claimable Tokens Program. */
  programId?: PublicKey
  /** The programId of the SPL Token Program. */
  tokenProgramId?: PublicKey
}
export type TransferClaimableTokensUnsignedInstructionData = {
  /** The instruction identifier */
  instruction: ClaimableTokensInstruction.Transfer
  sender: string
}
export type TransferClaimableTokensSignedInstructionData = {
  /** The destination token account. */
  destination: PublicKey
  /** The amount to send, in "wei"/"lamports" */
  amount: bigint
  /** The current value of the nonce account. */
  nonce: bigint
}

export type DecodedTransferClaimableTokensInstruction = {
  programId: PublicKey
  keys: {
    /** The account used to pay for the transfer. */
    payer: AccountMeta
    /** The sending user's user bank account. */
    sourceUserBank: AccountMeta
    /** The destination token account. */
    destination: AccountMeta
    /** The nonce account, used to prevent double spends. */
    nonceAccount: AccountMeta
    /** The PDA owner of all user banks for the given mint and program ID */
    authority: AccountMeta
    /** The rent sysvar account. */
    rent: AccountMeta
    /** The instructions sysvar account. */
    sysvarInstructions: AccountMeta
    /** The programId of System Program. */
    systemProgramId: AccountMeta
    /** The programId of the SPL Token Program. */
    tokenProgramId: AccountMeta
  }
  data: TransferClaimableTokensUnsignedInstructionData
}

export type SetClaimableTokensAuthorityParams = {
  /** The user bank account to change the authority of. */
  userBank: PublicKey
  /** The PDA owner of all user banks for the given mint and program ID. */
  authority: PublicKey
  /** The programId of the Claimable Tokens Program. */
  programId?: PublicKey
  /** The programId of the SPL Token Program. */
  tokenProgramId?: PublicKey
}

export type SetClaimableTokensAuthorityInstructionData = {
  /** The instruction identifier. */
  instruction: ClaimableTokensInstruction.SetAuthority
}

export type DecodedSetClaimableTokensAuthorityInstruction = {
  programId: PublicKey
  keys: {
    /** The user bank account to change the authority of. */
    userBank: AccountMeta
    /** The PDA owner of all user banks for the given mint and program ID. */
    authority: AccountMeta
    /** The instructions sysvar account. */
    sysvarInstructions: AccountMeta
    /** The recent blockhashes sysvar account. */
    recentBlockhashes: AccountMeta
    /** The programId of the SPL Token Program. */
    tokenProgramId: AccountMeta
  }
  data: SetClaimableTokensAuthorityInstructionData
}

/**
 * The message signed by the user's Ethereum wallet in the Secp256k1
 * instruction preceding a SetAuthority instruction.
 */
export type SetClaimableTokensAuthoritySignedData = {
  /** A recent blockhash, used to prevent replays. */
  blockhash: string
  /** The user bank account to change the authority of. */
  userBank: PublicKey
  /** The type of authority to change. */
  authorityType: AuthorityType
  /** The new authority. */
  newAuthority: PublicKey | null
}

export type CloseClaimableTokensAccountInstructionData = {
  /** The instruction identifier. */
  instruction: ClaimableTokensInstruction.Close
  /** The user's Ethereum wallet address. */
  ethAddress: string
}

export type DecodedCloseClaimableTokensAccountInstruction = {
  programId: PublicKey
  keys: {
    /** The user bank account to close. */
    userBank: AccountMeta
    /** The PDA owner of all user banks for the given mint and program ID. */
    authority: AccountMeta
    /** The account receiving the rent. */
    destination: AccountMeta
    /** The programId of the SPL Token Program. */
    tokenProgramId: AccountMeta
  }
  data: CloseClaimableTokensAccountInstructionData
}

export type DecodedClaimableTokenInstruction =
  | DecodedCreateClaimableTokensAccountInstruction
  | DecodedTransferClaimableTokensInstruction
  | DecodedSetClaimableTokensAuthorityInstruction
  | DecodedCloseClaimableTokensAccountInstruction

export type NonceAccountData = {
  /** The current version of the program. */
  version: number
  /** The current nonce value. */
  nonce: bigint
}
