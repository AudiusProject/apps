import {
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction
} from '@solana/web3.js'
import { serialize } from 'borsh'
import bs58 from 'bs58'

import { SolanaUtils } from './SolanaUtils'
import type { TransactionHandler } from './transactionHandler'

class CreateTokenAccountInstructionData {
  hashed_eth_pk: Uint8Array

  constructor({ ethAddress }: { ethAddress: Uint8Array }) {
    this.hashed_eth_pk = ethAddress
  }
}

const createTokenAccountInstructionSchema = new Map([
  [
    CreateTokenAccountInstructionData,
    {
      kind: 'struct',
      fields: [['hashed_eth_pk', [20]]]
    }
  ]
])

export const getBankAccountAddress = async (
  ethAddress: string,
  claimableTokenPDA: PublicKey,
  solanaTokenProgramKey: PublicKey
) => {
  const ethAddressArr = SolanaUtils.ethAddressToArray(ethAddress)

  const b58EthAddress = bs58.encode(ethAddressArr)

  const accountToGenerate = await PublicKey.createWithSeed(
    claimableTokenPDA,
    b58EthAddress,
    solanaTokenProgramKey
  )
  return accountToGenerate
}

type CreateUserBankFromConfig = {
  ethAddress: string
  claimableTokenPDAKey: PublicKey
  feePayerKey: PublicKey
  mintKey: PublicKey
  solanaTokenProgramKey: PublicKey
  claimableTokenProgramKey: PublicKey
  transactionHandler: TransactionHandler
  recentBlockhash?: string
}

export const createUserBankFrom = async ({
  ethAddress,
  claimableTokenPDAKey,
  feePayerKey,
  mintKey,
  solanaTokenProgramKey,
  claimableTokenProgramKey,
  transactionHandler,
  recentBlockhash
}: CreateUserBankFromConfig) => {
  const ethAddressArr = SolanaUtils.ethAddressToArray(ethAddress)

  const instructionData = new CreateTokenAccountInstructionData({
    ethAddress: ethAddressArr
  })
  const serializedInstructionData = serialize(
    createTokenAccountInstructionSchema,
    instructionData
  )

  const serializedInstructionEnum = Uint8Array.of(
    0,
    ...serializedInstructionData
  )

  const accountToGenerate = await getBankAccountAddress(
    ethAddress,
    claimableTokenPDAKey,
    solanaTokenProgramKey
  )

  const accounts = [
    {
      pubkey: feePayerKey,
      isSigner: true,
      isWritable: true
    },
    {
      pubkey: mintKey,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: claimableTokenPDAKey,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: accountToGenerate,
      isSigner: false,
      isWritable: true
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: solanaTokenProgramKey,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false
    }
  ]

  const instructions = [
    new TransactionInstruction({
      keys: accounts,
      programId: claimableTokenProgramKey.toString() as unknown as PublicKey,
      data: Buffer.from(serializedInstructionEnum)
    }),
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 100000
    })
  ]

  return await transactionHandler.handleTransaction({
    instructions,
    recentBlockhash,
    feePayerOverride: feePayerKey
  })
}
