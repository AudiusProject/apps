import { AccountMeta, PublicKey } from '@solana/web3.js'

import { RewardManagerInstruction } from './constants'

export type InitRewardManagerParams = {
  /** The account to initialize as the reward manager state. */
  rewardManagerState: PublicKey
  /** The token account to hold rewards. */
  tokenAccount: PublicKey
  /** The mint for the token account. */
  mint: PublicKey
  /** The admin account that will manage the reward manager. */
  manager: PublicKey
  /** Minimum number of votes required to disburse rewards. */
  minVotes: number
  /** The programId of the Reward Manager Program. */
  rewardManagerProgramId?: PublicKey
}

export type InitRewardManagerInstructionData = {
  /** The instruction identifier. */
  instruction: RewardManagerInstruction
  /** Minimum number of votes required to disburse rewards. */
  minVotes: number
}

export type DecodedInitRewardManagerInstruction = {
  programId: PublicKey
  keys: {
    /** The account to initialize as the reward manager state. */
    rewardManagerState: AccountMeta
    /** The token account to hold rewards. */
    tokenAccount: AccountMeta
    /** The mint for the token account. */
    mint: AccountMeta
    /** The admin account that will manage the reward manager. */
    manager: AccountMeta
    /** The reward manager authority PDA. */
    authority: AccountMeta
    /** The SPL Token program. */
    tokenProgram: AccountMeta
    /** The rent sysvar account. */
    rent: AccountMeta
  }
  data: InitRewardManagerInstructionData
}

export type CreateRewardSenderParams = {
  /** The node's Ethereum wallet address. */
  senderEthAddress: string
  /** The node operator's Ethereum wallet address. */
  operatorEthAddress: string
  /** The PDA tracking the program state (version, token account with rewards, authority, and min votes) */
  rewardManagerState: PublicKey
  /** The admin account that controls the reward manager state. */
  manager: PublicKey
  /** The PDA that owns the derived sender accounts. */
  authority: PublicKey
  /** The account used to pay for the sender account creation. */
  payer: PublicKey
  /** The sender account to create. */
  sender: PublicKey
  /** The programId of the Reward Manager Program. */
  rewardManagerProgramId: PublicKey
}

export type CreateSenderInstructionData = {
  /** The instruction identifier. */
  instruction: RewardManagerInstruction
  /** The node's Ethereum wallet address. */
  senderEthAddress: string
  /** The node operator's Ethereum wallet address. */
  operatorEthAddress: string
}

export type DecodedCreateSenderInstruction = {
  programId: PublicKey
  keys: {
    /** The PDA tracking the program state (version, token account with rewards, authority, and min votes) */
    rewardManagerState: AccountMeta
    /** The admin account that controls the reward manager state. */
    manager: AccountMeta
    /** The PDA that owns the derived sender accounts. */
    authority: AccountMeta
    /** The account used to pay for the sender account creation. */
    payer: AccountMeta
    /** The sender account to create. */
    sender: AccountMeta
    /** The programId of System Program. */
    systemProgramId: AccountMeta
    /** The rent sysvar account. */
    rent: AccountMeta
  }
  data: CreateSenderInstructionData
}

export type CreateRewardSenderPublicParams = {
  /** The node's Ethereum wallet address. */
  senderEthAddress: string
  /** The node operator's Ethereum wallet address. */
  operatorEthAddress: string
  /** The PDA tracking the program state (version, token account with rewards, authority, and min votes) */
  rewardManagerState: PublicKey
  /** The PDA that owns the derived sender accounts. */
  authority: PublicKey
  /** The account used to pay for the sender account creation. */
  payer: PublicKey
  /** The sender account to create. */
  sender: PublicKey
  /** A list of existing sender accounts that attest to the new sender. */
  existingSenders: PublicKey[]
  /** The programId of the Reward Manager Program. */
  rewardManagerProgramId: PublicKey
}

export type CreateSenderPublicInstructionData = {
  /** The instruction identifier. */
  instruction: RewardManagerInstruction
  /** The node's Ethereum wallet address. */
  senderEthAddress: string
  /** The node operator's Ethereum wallet address. */
  operatorEthAddress: string
}

export type DecodedCreateSenderPublicInstruction = {
  programId: PublicKey
  keys: {
    /** The PDA tracking the program state (version, token account with rewards, authority, and min votes) */
    rewardManagerState: AccountMeta
    /** The PDA that owns the derived sender accounts. */
    authority: AccountMeta
    /** The account used to pay for the sender account creation. */
    payer: AccountMeta
    /** The sender account to create. */
    sender: AccountMeta
    /** The instructions sysvar account. */
    sysvarInstructions: AccountMeta
    /** The rent sysvar account. */
    rent: AccountMeta
    /** The programId of System Program. */
    systemProgramId: AccountMeta
    /** A list of existing sender accounts that attest to the new sender. */
    existingSenders: AccountMeta[]
  }
  data: CreateSenderPublicInstructionData
}

export type DecodedDeleteSenderPublicInstruction = {
  programId: PublicKey
  keys: {
    /** The PDA tracking the program state (version, token account with rewards, authority, and min votes) */
    rewardManagerState: AccountMeta
    /** The sender account to delete. */
    sender: AccountMeta
    /** The account to refund the rent to from the sender account creation. */
    refunder: AccountMeta
    /** The instructions sysvar account. */
    sysvarInstructions: AccountMeta
    /** A list of existing sender accounts that attest to the new sender. */
    existingSenders: AccountMeta[]
  }
  data: {
    /** The instruction identifier. */
    instruction: RewardManagerInstruction.DeleteSenderPublic
  }
}

export type SubmitRewardAttestationParams = {
  /** The identifier of a disbursement, usually "challengeId:specifier". */
  disbursementId: string
  /** The derived account of the transferId that will hold the attestations. */
  attestations: PublicKey
  /** The PDA tracking the program state (version, token account with rewards, authority, and min votes) */
  rewardManagerState: PublicKey
  /** The PDA that owns the derived sender accounts. */
  authority: PublicKey
  /** The account used to pay for the sender account creation. */
  payer: PublicKey
  /** The sender attesting. */
  sender: PublicKey
  /** The programId of the Reward Manager Program. */
  rewardManagerProgramId: PublicKey
}

export type SubmitAttestationInstructionData = {
  /** The instruction identifier. */
  instruction: RewardManagerInstruction
  /** The identifier of a disbursement, usually "challengeId:specifier". */
  disbursementId: string
}

export type SubmitDiscoveryAttestationSignedInstructionData = {
  /** The Ethereum wallet of the recipient. */
  recipientEthAddress: string
  /** The amount to reward the recipient. */
  amount: bigint
  /** The identifier of a disbursement, usually "challengeId:specifier". */
  disbursementId: string
  /** The Ethereum wallet of the attesting anti abuse oracle. */
  antiAbuseOracleEthAddress: string
}

export type SubmitOracleAttestationSignedInstructionData = {
  /** The Ethereum wallet of the recipient. */
  recipientEthAddress: string
  /** The amount to reward the recipient. */
  amount: bigint
  /** The identifier of a disbursement, usually "challengeId:specifier". */
  disbursementId: string
}

export type DecodedSubmitAttestationsInstruction = {
  programId: PublicKey
  keys: {
    /** The derived account of the transferId that will hold the attestations. */
    attestations: AccountMeta
    /** The PDA tracking the program state (version, token account with rewards, authority, and min votes) */
    rewardManagerState: AccountMeta
    /** The PDA that owns the derived sender accounts. */
    authority: AccountMeta
    /** The account used to pay for the attestations account. */
    payer: AccountMeta
    /** The sender attesting. */
    sender: AccountMeta
    /** The rent sysvar account. */
    rent: AccountMeta
    /** The instructions sysvar account. */
    sysvarInstructions: AccountMeta
    /** The programId of System Program. */
    systemProgramId: AccountMeta
  }
  data: SubmitAttestationInstructionData
}

export type EvaluateRewardAttestationsParams = {
  /** The identifier of a disbursement, usually "challengeId:specifier". */
  disbursementId: string
  /** The Ethereum wallet of the recipient of the disbursement. */
  recipientEthAddress: string
  /** The amount to reward the recipient. */
  amount: bigint
  /** The derived account of the transferId that holds the attestations to be evaluated. */
  attestations: PublicKey
  /** The PDA tracking the program state (version, token account with rewards, authority, and min votes) */
  rewardManagerState: PublicKey
  /** The PDA that owns the derived sender accounts. */
  authority: PublicKey
  /** The PDA that owns the reward tokens. */
  rewardManagerTokenSource: PublicKey
  /** The user bank of the recipient. */
  destinationUserBank: PublicKey
  /** The disbursement account that will mark that a disbursement has been completed. */
  disbursementAccount: PublicKey
  /** The derived sender account for the attesting anti abuse oracle. */
  antiAbuseOracle: PublicKey
  /** The account used to pay for the disbursement account creation and receive the attestations account rent. */
  payer: PublicKey
  /** The programId of the SPL Token Program. */
  tokenProgramId?: PublicKey
  /** The programId of the Reward Manager Program. */
  rewardManagerProgramId?: PublicKey
}

export type EvaluateAttestationsInstructionData = {
  /** The instruction identifier. */
  instruction: RewardManagerInstruction
  /** The amount to reward the recipient. */
  amount: bigint
  /** The identifier of a disbursement, usually "challengeId:specifier". */
  disbursementId: string
  /** The Ethereum wallet of the recipient of the disbursement. */
  recipientEthAddress: string
}

export type DecodedEvaluateAttestationsInstruction = {
  programId: PublicKey
  keys: {
    /** The derived account of the transferId that holds the attestations to be evaluated. */
    attestations: AccountMeta
    /** The PDA tracking the program state (version, token account with rewards, authority, and min votes) */
    rewardManagerState: AccountMeta
    /** The PDA that owns the derived sender accounts. */
    authority: AccountMeta
    /** The PDA that owns the reward tokens. */
    rewardManagerTokenSource: AccountMeta
    /** The user bank of the recipient. */
    destinationUserbank: AccountMeta
    /** The disbursement account that will mark that a disbursement has been completed. */
    disbursementAccount: AccountMeta
    /** The derived sender account for the attesting anti abuse oracle. */
    antiAbuseOracle: AccountMeta
    /** The account used to pay for the disbursement account creation and receive the attestations account rent. */
    payer: AccountMeta
    /** The rent sysvar account. */
    rent: AccountMeta
    /** The programId of the SPL Token Program. */
    tokenProgramId: AccountMeta
    /** The programId of System Program. */
    systemProgramId: AccountMeta
  }
  data: EvaluateAttestationsInstructionData
}

export type DecodedRewardManagerInstruction =
  | DecodedInitRewardManagerInstruction
  | DecodedCreateSenderInstruction
  | DecodedCreateSenderPublicInstruction
  | DecodedDeleteSenderPublicInstruction
  | DecodedSubmitAttestationsInstruction
  | DecodedEvaluateAttestationsInstruction

export type RewardManagerStateData = {
  /** The version of the program. */
  version: number
  /** The PDA that owns the reward tokens. */
  tokenAccount: PublicKey
  /** The admin account that controls the reward manager state. */
  manager: PublicKey
  /** The minimum number of votes from attesters to achieve quorum. */
  minVotes: number
}

export type Attestation = {
  recipientEthAddress: string
  amount: bigint
  disbursementId: string
  antiAbuseOracleEthAddress?: string | null
}

export type SenderAttestation = {
  rewardManagerState: PublicKey
  senderEthAddress: string
}

export type VerifiedMessage = {
  senderEthAddress: string
  attestation: Attestation
  // Hint to make types not complain when adding empty padding for
  // the array of verified messages in the account data.
  _: Uint8Array
  operator: string
}

export type AttestationsAccountData = {
  version: number
  rewardManagerState: PublicKey
  count: number
  messages: VerifiedMessage[]
}
