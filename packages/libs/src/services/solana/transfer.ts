import {
  SystemProgram,
  PublicKey,
  Secp256k1Program,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
  Connection,
  ComputeBudgetProgram
} from '@solana/web3.js'
import BN from 'bn.js'
import { deserialize, serialize } from 'borsh'
import secp256k1 from 'secp256k1'

import { SolanaUtils } from './SolanaUtils'
import { ClaimableProgramError } from './errors'
import type { TransactionHandler } from './transactionHandler'

const encoder = new TextEncoder()

const TRANSFER_NONCE_PREFIX = 'N_'

type DeriveTransferNonceAccountConfig = {
  ethAddress: string
  mintKey: PublicKey
  claimableTokenProgramKey: PublicKey
}

export const deriveTransferNonceAccount = async ({
  ethAddress,
  mintKey,
  claimableTokenProgramKey
}: DeriveTransferNonceAccountConfig) => {
  const ethAddressArr = SolanaUtils.ethAddressToArray(ethAddress)
  const seed = Uint8Array.from([
    ...encoder.encode(TRANSFER_NONCE_PREFIX),
    ...ethAddressArr
  ])

  const res = await SolanaUtils.findProgramAddressWithAuthority(
    claimableTokenProgramKey,
    mintKey,
    seed
  )
  return res[1]
}

class NonceAccount {
  version: string
  nonce: BN

  constructor({ version, nonce }: { version: string; nonce: BN }) {
    this.version = version
    this.nonce = nonce
  }
}

const NonceAccountSchema = new Map([
  [
    NonceAccount,
    {
      kind: 'struct',
      fields: [
        ['version', 'u8'],
        ['nonce', 'u64']
      ]
    }
  ]
])

type GetAccountNonceParams = {
  connection: Connection
  ethAddress: string
  mintKey: PublicKey
  claimableTokenProgramKey: PublicKey
}

async function getAccountNonce({
  connection,
  ethAddress,
  mintKey,
  claimableTokenProgramKey
}: GetAccountNonceParams) {
  let nonce = new BN(0)
  const transferNonceAccount = await deriveTransferNonceAccount({
    ethAddress,
    mintKey,
    claimableTokenProgramKey
  })
  const accInfo = await connection.getAccountInfoAndContext(
    transferNonceAccount,
    'confirmed'
  )
  if (accInfo.value) {
    const nonceAccount: NonceAccount = deserialize(
      NonceAccountSchema,
      NonceAccount,
      accInfo.value.data
    )
    nonce = nonceAccount.nonce
  }
  return {
    accountNonce: transferNonceAccount,
    nonce
  }
}

type TransferInstructionDataConfig = {
  targetPubKey: Buffer
  amount: BN
  nonce: BN
}

class TransferInstructionData {
  target_pubkey: Buffer
  amount: BN
  nonce: BN

  constructor({ targetPubKey, amount, nonce }: TransferInstructionDataConfig) {
    this.target_pubkey = targetPubKey
    this.amount = amount
    this.nonce = nonce
  }
}

const transferInstructionDataSchema = new Map([
  [
    TransferInstructionData,
    {
      kind: 'struct',
      fields: [
        ['target_pubkey', [32]], // type pubkey of length 32 bytes
        ['amount', 'u64'],
        ['nonce', 'u64']
      ]
    }
  ]
])

type TransferWAudioBalanceConfig = {
  amount: BN
  senderEthAddress: string
  senderEthPrivateKey: string
  senderSolanaAddress: PublicKey
  recipientSolanaAddress: string
  claimableTokenPDA: PublicKey
  solanaTokenProgramKey: PublicKey
  connection: Connection
  feePayerKey: PublicKey
  claimableTokenProgramKey: PublicKey
  mintKey: PublicKey
  transactionHandler: TransactionHandler
  instructionIndex?: number
  nonceOffset?: number
}

export async function transferWAudioBalance(args: TransferWAudioBalanceConfig) {
  const instructions = await createTransferInstructions(args)
  return await args.transactionHandler.handleTransaction({
    instructions: [
      ...instructions,
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 100000
      })
    ],
    errorMapping: ClaimableProgramError,
    feePayerOverride: args.feePayerKey
  })
}

export const createTransferInstructions = async ({
  amount,
  senderEthAddress,
  senderEthPrivateKey,
  senderSolanaAddress,
  recipientSolanaAddress,
  claimableTokenPDA,
  solanaTokenProgramKey,
  feePayerKey,
  claimableTokenProgramKey,
  connection,
  mintKey,
  instructionIndex = 0,
  nonceOffset = 0
}: Omit<TransferWAudioBalanceConfig, 'transactionHandler'>) => {
  const senderSolanaPubkey = new PublicKey(senderSolanaAddress)
  const recipientPubkey = new PublicKey(recipientSolanaAddress)

  const { accountNonce, nonce } = await getAccountNonce({
    connection,
    mintKey,
    ethAddress: senderEthAddress,
    claimableTokenProgramKey
  })

  const accounts = [
    {
      pubkey: feePayerKey,
      isSigner: true,
      isWritable: false
    },
    {
      pubkey: senderSolanaPubkey,
      isSigner: false,
      isWritable: true
    },
    {
      pubkey: recipientPubkey,
      isSigner: false,
      isWritable: true
    },
    {
      pubkey: accountNonce,
      isSigner: false,
      isWritable: true
    },
    {
      pubkey: claimableTokenPDA,
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
    },
    {
      pubkey: solanaTokenProgramKey,
      isSigner: false,
      isWritable: false
    }
  ]

  const ethPrivateKeyArr = Buffer.from(senderEthPrivateKey, 'hex')
  const ethPubkey = secp256k1.publicKeyCreate(ethPrivateKeyArr, false).slice(1)

  const instructionData = new TransferInstructionData({
    targetPubKey: recipientPubkey.toBuffer(),
    amount,
    nonce: nonce.addn(nonceOffset)
  })

  const serializedInstructionData = serialize(
    transferInstructionDataSchema,
    instructionData
  )

  const { signature, recoveryId } = SolanaUtils.signBytes(
    Buffer.from(serializedInstructionData),
    senderEthPrivateKey
  )

  const secpTransactionInstruction =
    Secp256k1Program.createInstructionWithPublicKey({
      publicKey: Buffer.from(ethPubkey),
      message: Buffer.from(serializedInstructionData),
      signature,
      recoveryId,
      instructionIndex
    })

  const ethAddressArr = SolanaUtils.ethAddressToArray(senderEthAddress)
  const transferDataInstr = Uint8Array.of(1, ...ethAddressArr)
  const transferInstruction = new TransactionInstruction({
    keys: accounts,
    programId: claimableTokenProgramKey,
    data: Buffer.from(transferDataInstr)
  })

  return [secpTransactionInstruction, transferInstruction]
}
