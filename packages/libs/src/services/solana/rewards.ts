import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  ComputeBudgetProgram,
  PublicKey,
  Secp256k1Program,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction
} from '@solana/web3.js'
import BN from 'bn.js'
import { serialize } from 'borsh'

import type { Logger, Nullable } from '../../utils'
import type { IdentityService } from '../identity'

import { SolanaUtils } from './SolanaUtils'
import { RewardsManagerError } from './errors'
import type { TransactionHandler } from './transactionHandler'
import { getBankAccountAddress } from './userBank'

const SENDER_SEED_PREFIX = 'S_'
const VERIFY_TRANSFER_SEED_PREFIX = 'V_'
const TRANSFER_PREFIX = 'T_'
const ADD_SENDER_MESSAGE_PREFIX = 'add'

const CREATE_SENDER_PUBLIC_ENUM_VALUE = 4
const SUBMIT_INSTRUCTION_ENUM_VALUE = 6
const EVALUATE_INSTRUCTION_ENUM_VALUE = 7

const ATTESTATION_INSTRUCTIONS_PER_TRANSACTION = 4

const encoder = new TextEncoder()

class SubmitAttestationInstructionData {
  id: string
  constructor({ transferId }: { transferId: string }) {
    this.id = transferId
  }
}

const submitAttestationInstructionSchema = new Map([
  [
    SubmitAttestationInstructionData,
    {
      kind: 'struct',
      fields: [['id', 'string']]
    }
  ]
])

type ValidateAttestationsInstructionDataConfig = {
  amount: number
  id: string
  ethRecipient: Uint8Array
}

class ValidateAttestationsInstructionData {
  amount: number
  id: string
  eth_recipient: Uint8Array

  constructor({
    amount,
    id,
    ethRecipient
  }: ValidateAttestationsInstructionDataConfig) {
    this.amount = amount
    this.id = id
    this.eth_recipient = ethRecipient
  }
}

const validateAttestationsInstructionSchema = new Map([
  [
    ValidateAttestationsInstructionData,
    {
      kind: 'struct',
      fields: [
        ['amount', 'u64'],
        ['id', 'string'],
        ['eth_recipient', [20]]
      ]
    }
  ]
])

class CreateSenderPublicInstructionData {
  eth_address: Uint8Array
  operator: Uint8Array

  constructor({
    ethAddress,
    operator
  }: {
    ethAddress: Uint8Array
    operator: Uint8Array
  }) {
    this.eth_address = ethAddress
    this.operator = operator
  }
}

const createSenderPublicInstructionSchema = new Map([
  [
    CreateSenderPublicInstructionData,
    {
      kind: 'struct',
      fields: [
        ['eth_address', [20]],
        ['operator', [20]]
      ]
    }
  ]
])

export type AttestationMeta = {
  ethAddress: string
  signature: string
}

export type SubmitAttestationsConfig = {
  rewardManagerProgramId: PublicKey
  rewardManagerAccount: PublicKey
  attestations: AttestationMeta[]
  oracleAttestation: AttestationMeta
  challengeId: string
  specifier: string
  feePayer: PublicKey
  attestationSignature?: string
  recipientEthAddress: string
  tokenAmount: BN
  transactionHandler: TransactionHandler
  instructionsPerTransaction?: number
  logger: Logger
}

export async function submitAttestations({
  rewardManagerProgramId,
  rewardManagerAccount,
  attestations,
  oracleAttestation,
  challengeId,
  specifier,
  feePayer,
  recipientEthAddress,
  tokenAmount,
  transactionHandler,
  instructionsPerTransaction = ATTESTATION_INSTRUCTIONS_PER_TRANSACTION,
  logger = console
}: SubmitAttestationsConfig) {
  const transferId = SolanaUtils.constructTransferId(challengeId, specifier)

  const [rewardManagerAuthority, derivedMessageAccount] =
    await deriveMessageAccount(
      transferId,
      rewardManagerProgramId,
      rewardManagerAccount
    )

  const encodedSenderMessage = SolanaUtils.constructAttestation(
    recipientEthAddress,
    tokenAmount,
    transferId,
    oracleAttestation.ethAddress
  )

  let instructions: TransactionInstruction[] = await Promise.all(
    attestations.reduce<Array<Promise<TransactionInstruction>>>(
      (instructions, meta, i) => {
        const secpInstruction = Promise.resolve(
          generateAttestationSecpInstruction({
            attestationMeta: meta,
            instructionIndex: (2 * i) % instructionsPerTransaction,
            encodedSenderMessage
          })
        )
        const verifyInstruction = generateSubmitAttestationInstruction({
          attestationMeta: meta,
          derivedMessageAccount,
          rewardManagerAccount,
          rewardManagerProgramId,
          rewardManagerAuthority,
          transferId,
          feePayer
        })
        return [...instructions, secpInstruction, verifyInstruction]
      },
      []
    )
  )

  const encodedOracleMessage = SolanaUtils.constructAttestation(
    recipientEthAddress,
    tokenAmount,
    transferId
  )

  const oracleSecp = generateAttestationSecpInstruction({
    attestationMeta: oracleAttestation,
    instructionIndex: instructions.length % instructionsPerTransaction,
    encodedSenderMessage: encodedOracleMessage
  })

  const oracleTransfer = await generateSubmitAttestationInstruction({
    attestationMeta: oracleAttestation,
    derivedMessageAccount,
    rewardManagerAccount,
    rewardManagerProgramId,
    rewardManagerAuthority,
    transferId,
    feePayer
  })

  instructions = [...instructions, oracleSecp, oracleTransfer]
  const bucketedInstructions: TransactionInstruction[][] = instructions.reduce<
    TransactionInstruction[][]
  >(
    (acc, cur) => {
      const instruction = acc[acc.length - 1]
      if (instruction && instruction.length < instructionsPerTransaction) {
        instruction.push(cur)
      } else {
        acc.push([cur])
      }
      return acc
    },
    [[]]
  )

  const results = await Promise.all(
    bucketedInstructions.map(
      async (i) =>
        await transactionHandler.handleTransaction({
          instructions: [
            ...i,
            ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: 100000
            })
          ],
          errorMapping: RewardsManagerError,
          logger,
          skipPreflight: false,
          feePayerOverride: feePayer,
          sendBlockhash: false
        })
    )
  )
  logger.info(
    `submitAttestations: submitted attestations with results: ${JSON.stringify(
      results
    )}`
  )

  for (const res of results) {
    if (res.error ?? res.errorCode) {
      return res
    }
  }
  return results[0]
}

export type CreateSenderParams = {
  rewardManagerProgramId: PublicKey
  rewardManagerAccount: PublicKey
  senderEthAddress: string
  feePayer: PublicKey
  operatorEthAddress: string
  attestations: AttestationMeta[]
  identityService: Nullable<IdentityService>
  transactionHandler: TransactionHandler
}

export async function createSender({
  rewardManagerProgramId,
  rewardManagerAccount,
  senderEthAddress,
  feePayer,
  operatorEthAddress,
  attestations,
  transactionHandler
}: CreateSenderParams) {
  const [rewardManagerAuthority] =
    await SolanaUtils.findProgramAddressFromPubkey(
      rewardManagerProgramId,
      rewardManagerAccount
    )

  const encodedSenderMessage = constructCreateSenderMessage(
    senderEthAddress,
    rewardManagerAccount
  )
  const signerEthAddresses = attestations.map((meta) => meta.ethAddress)
  const signerInstructions = attestations.map((meta, i) => {
    return generateCreateSenderSecpInstruction({
      attestationMeta: meta,
      instructionIndex: i,
      encodedSenderMessage
    })
  })

  const createSenderInstruction = await generateCreateSenderInstruction({
    senderEthAddress,
    operatorEthAddress,
    rewardManagerAccount,
    rewardManagerAuthority,
    rewardManagerProgramId,
    feePayer,
    signerEthAddresses
  })

  const instructions = [
    ...signerInstructions,
    createSenderInstruction,
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 100000
    })
  ]
  return await transactionHandler.handleTransaction({
    instructions,
    errorMapping: RewardsManagerError,
    feePayerOverride: feePayer
  })
}

export type EvaluateAttestationsConfig = {
  rewardManagerProgramId: PublicKey
  rewardManagerAccount: PublicKey
  rewardManagerTokenSource: PublicKey
  challengeId: string
  specifier: string
  recipientEthAddress: string
  userBankProgramAccount: PublicKey
  oracleEthAddress: string
  feePayer: PublicKey
  tokenAmount: BN
  transactionHandler: TransactionHandler
  logger: Logger
}

export const evaluateAttestations = async ({
  rewardManagerProgramId,
  rewardManagerAccount,
  rewardManagerTokenSource,
  challengeId,
  specifier,
  recipientEthAddress,
  userBankProgramAccount,
  oracleEthAddress,
  feePayer,
  tokenAmount,
  transactionHandler,
  logger = console
}: EvaluateAttestationsConfig) => {
  const transferId = SolanaUtils.constructTransferId(challengeId, specifier)

  const [rewardManagerAuthority, verifiedMessagesAccount] =
    await deriveMessageAccount(
      transferId,
      rewardManagerProgramId,
      rewardManagerAccount
    )
  const transferAccount = await deriveTransferAccount(
    transferId,
    rewardManagerProgramId,
    rewardManagerAccount
  )
  const recipientBankAccount = await getBankAccountAddress(
    recipientEthAddress,
    userBankProgramAccount,
    TOKEN_PROGRAM_ID
  )

  const derivedAAOAddress = await deriveSolanaSenderFromEthAddress(
    oracleEthAddress,
    rewardManagerProgramId,
    rewardManagerAccount
  )

  const accounts = [
    {
      pubkey: verifiedMessagesAccount,
      isSigner: false,
      isWritable: true
    },
    {
      pubkey: rewardManagerAccount,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: rewardManagerAuthority,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: rewardManagerTokenSource,
      isSigner: false,
      isWritable: true
    },
    {
      pubkey: recipientBankAccount,
      isSigner: false,
      isWritable: true
    },
    {
      pubkey: transferAccount,
      isSigner: false,
      isWritable: true
    },
    {
      pubkey: derivedAAOAddress,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: feePayer,
      isSigner: true,
      isWritable: true
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false
    }
  ]

  const instructionData = new ValidateAttestationsInstructionData({
    amount: tokenAmount.toNumber(),
    id: transferId,
    ethRecipient: SolanaUtils.ethAddressToArray(recipientEthAddress)
  })
  const serializedInstructionData = serialize(
    validateAttestationsInstructionSchema,
    instructionData
  )
  const serializedInstructionEnum = Buffer.from(
    Uint8Array.of(EVALUATE_INSTRUCTION_ENUM_VALUE, ...serializedInstructionData)
  )
  const transferInstruction = new TransactionInstruction({
    keys: accounts,
    programId: rewardManagerProgramId,
    data: serializedInstructionEnum
  })

  return await transactionHandler.handleTransaction({
    instructions: [
      transferInstruction,
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 100000
      })
    ],
    errorMapping: RewardsManagerError,
    logger,
    skipPreflight: false,
    feePayerOverride: feePayer,
    sendBlockhash: false
  })
}

type GenerateSubmitAttestationInstructionParams = {
  attestationMeta: AttestationMeta
  derivedMessageAccount: PublicKey
  rewardManagerAccount: PublicKey
  rewardManagerAuthority: PublicKey
  rewardManagerProgramId: PublicKey
  feePayer: PublicKey
  transferId: string
}

const generateSubmitAttestationInstruction = async ({
  attestationMeta,
  derivedMessageAccount,
  rewardManagerAccount,
  rewardManagerAuthority,
  rewardManagerProgramId,
  feePayer,
  transferId
}: GenerateSubmitAttestationInstructionParams) => {
  const derivedSender = await deriveSolanaSenderFromEthAddress(
    attestationMeta.ethAddress,
    rewardManagerProgramId,
    rewardManagerAccount
  )

  const verifyInstructionAccounts = [
    {
      pubkey: derivedMessageAccount,
      isSigner: false,
      isWritable: true
    },
    {
      pubkey: rewardManagerAccount,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: rewardManagerAuthority,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: feePayer,
      isSigner: true,
      isWritable: true
    },
    {
      pubkey: derivedSender,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false
    }
  ]

  const instructionData = new SubmitAttestationInstructionData({ transferId })
  const serializedInstructionData = serialize(
    submitAttestationInstructionSchema,
    instructionData
  )
  const serializedInstructionEnum = Buffer.from(
    Uint8Array.of(SUBMIT_INSTRUCTION_ENUM_VALUE, ...serializedInstructionData)
  )

  return new TransactionInstruction({
    keys: verifyInstructionAccounts,
    programId: rewardManagerProgramId,
    data: serializedInstructionEnum
  })
}

const encodeSignature = (signature: string) => {
  let strippedSignature = signature.replace('0x', '')
  const recoveryIdStr = strippedSignature.slice(strippedSignature.length - 2)
  const recoveryId = new BN(recoveryIdStr, 'hex').toNumber()
  strippedSignature = strippedSignature.slice(0, strippedSignature.length - 2)
  const encodedSignature = Uint8Array.of(
    ...new BN(strippedSignature, 'hex').toArray('be', 64)
  )
  return { encodedSignature, recoveryId }
}

type GenerateAttestationSecpInstructionParams = {
  attestationMeta: AttestationMeta
  instructionIndex: number
  encodedSenderMessage: Uint8Array
}

const generateAttestationSecpInstruction = ({
  attestationMeta,
  instructionIndex,
  encodedSenderMessage
}: GenerateAttestationSecpInstructionParams) => {
  const { encodedSignature, recoveryId } = encodeSignature(
    attestationMeta.signature
  )

  return Secp256k1Program.createInstructionWithEthAddress({
    ethAddress: SolanaUtils.ethAddressToArray(attestationMeta.ethAddress),
    message: encodedSenderMessage,
    signature: encodedSignature,
    recoveryId,
    instructionIndex
  })
}

type GenerateCreateSenderSecpInstructionConfig = {
  attestationMeta: AttestationMeta
  instructionIndex: number
  encodedSenderMessage: Uint8Array
}

const generateCreateSenderSecpInstruction = ({
  attestationMeta,
  instructionIndex,
  encodedSenderMessage
}: GenerateCreateSenderSecpInstructionConfig) => {
  const { encodedSignature, recoveryId } = encodeSignature(
    attestationMeta.signature
  )
  return Secp256k1Program.createInstructionWithEthAddress({
    ethAddress: attestationMeta.ethAddress,
    message: encodedSenderMessage,
    signature: encodedSignature,
    recoveryId,
    instructionIndex
  })
}

type GenerateCreateSenderInstructionConfig = {
  senderEthAddress: string
  operatorEthAddress: string
  rewardManagerAccount: PublicKey
  rewardManagerAuthority: PublicKey
  rewardManagerProgramId: PublicKey
  feePayer: PublicKey
  signerEthAddresses: string[]
}

const generateCreateSenderInstruction = async ({
  senderEthAddress,
  operatorEthAddress,
  rewardManagerAccount,
  rewardManagerAuthority,
  rewardManagerProgramId,
  feePayer,
  signerEthAddresses
}: GenerateCreateSenderInstructionConfig) => {
  const derivedSenderSolanaAddress = await deriveSolanaSenderFromEthAddress(
    senderEthAddress,
    rewardManagerProgramId,
    rewardManagerAccount
  )

  const signerSolanaPubKeys = await Promise.all(
    signerEthAddresses.map(
      async (signerEthAddress) =>
        await deriveSolanaSenderFromEthAddress(
          signerEthAddress,
          rewardManagerProgramId,
          rewardManagerAccount
        )
    )
  )

  const createSenderInstructionAccounts = [
    {
      pubkey: rewardManagerAccount,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: rewardManagerAuthority,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: feePayer,
      isSigner: true,
      isWritable: true
    },
    {
      pubkey: derivedSenderSolanaAddress,
      isSigner: false,
      isWritable: true
    },
    {
      pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false
    },
    ...signerSolanaPubKeys.map((pubkey) => ({
      pubkey,
      isSigner: false,
      isWritable: false
    }))
  ]

  const createSenderPublicInstructionData =
    new CreateSenderPublicInstructionData({
      ethAddress: SolanaUtils.ethAddressToArray(senderEthAddress),
      operator: SolanaUtils.ethAddressToArray(operatorEthAddress)
    })
  const serializedInstructionData = serialize(
    createSenderPublicInstructionSchema,
    createSenderPublicInstructionData
  )
  const serializedInstructionEnum = Buffer.from(
    Uint8Array.of(CREATE_SENDER_PUBLIC_ENUM_VALUE, ...serializedInstructionData)
  )

  return new TransactionInstruction({
    keys: createSenderInstructionAccounts,
    programId: rewardManagerProgramId,
    data: serializedInstructionEnum
  })
}

export const deriveSolanaSenderFromEthAddress = async (
  ethAddress: string,
  rewardManagerProgramId: PublicKey,
  rewardManagerAccount: PublicKey
) => {
  const ethAddressArr = SolanaUtils.ethAddressToArray(ethAddress)
  const encodedPrefix = encoder.encode(SENDER_SEED_PREFIX)

  const [, derivedSender] = await SolanaUtils.findProgramAddressWithAuthority(
    rewardManagerProgramId,
    rewardManagerAccount,
    new Uint8Array([...encodedPrefix, ...ethAddressArr])
  )
  return derivedSender
}

const constructCreateSenderMessage = (
  ethAddress: string,
  rewardManagerAccount: PublicKey
) => {
  const encodedPrefix = encoder.encode(ADD_SENDER_MESSAGE_PREFIX)
  const ethAddressArr = SolanaUtils.ethAddressToArray(ethAddress)
  const rewardManagerAccountArr = rewardManagerAccount.toBytes()

  const items = [encodedPrefix, rewardManagerAccountArr, ethAddressArr] as const
  const res = items.slice(1).reduce((prev, cur) => {
    return Uint8Array.of(...prev, ...cur)
  }, Uint8Array.from(items[0]))
  return res
}

const deriveTransferAccount = async (
  transferId: string,
  rewardProgramId: PublicKey,
  rewardManager: PublicKey
) => {
  const seed = Uint8Array.from([
    ...encoder.encode(TRANSFER_PREFIX),
    ...encoder.encode(transferId)
  ])
  const [, derivedAddress] = await SolanaUtils.findProgramAddressWithAuthority(
    rewardProgramId,
    rewardManager,
    seed
  )
  return derivedAddress
}

const deriveMessageAccount = async (
  transferId: string,
  rewardsProgramId: PublicKey,
  rewardManager: PublicKey
) => {
  const encodedPrefix = encoder.encode(VERIFY_TRANSFER_SEED_PREFIX)
  const encodedTransferId = encoder.encode(transferId)
  const seeds = Uint8Array.from([...encodedPrefix, ...encodedTransferId])
  return await SolanaUtils.findProgramAddressWithAuthority(
    rewardsProgramId,
    rewardManager,
    seeds
  )
}
