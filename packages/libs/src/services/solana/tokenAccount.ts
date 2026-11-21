import { ASSOCIATED_TOKEN_PROGRAM_ID, getAccount } from '@solana/spl-token'
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Connection,
  Commitment
} from '@solana/web3.js'

import type { Nullable } from '../../utils'
import type { IdentityService } from '../identity'

type FindAssociatedTokenAddressConfig = {
  solanaWalletKey: PublicKey
  mintKey: PublicKey
  solanaTokenProgramKey: PublicKey
}

export async function findAssociatedTokenAddress({
  solanaWalletKey,
  mintKey,
  solanaTokenProgramKey
}: FindAssociatedTokenAddressConfig) {
  const addresses = await PublicKey.findProgramAddress(
    [
      solanaWalletKey.toBuffer(),
      solanaTokenProgramKey.toBuffer(),
      mintKey.toBuffer()
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )
  return addresses[0]
}

type GetTokenAccountInfoConfig = {
  tokenAccountAddressKey: PublicKey
  connection: Connection
  commitment?: Commitment
}

export async function getTokenAccountInfo({
  tokenAccountAddressKey,
  connection,
  commitment = 'processed'
}: GetTokenAccountInfoConfig) {
  const info = await getAccount(connection, tokenAccountAddressKey, commitment)
  return info
}

type CreateAssociatedTokenAccountParams = {
  feePayerKey: PublicKey
  solanaWalletKey: PublicKey
  mintKey: PublicKey
  solanaTokenProgramKey: PublicKey
  connection: Connection
  identityService: Nullable<IdentityService>
}

export async function createAssociatedTokenAccount({
  feePayerKey,
  solanaWalletKey,
  mintKey,
  solanaTokenProgramKey,
  connection,
  identityService
}: CreateAssociatedTokenAccountParams) {
  const associatedTokenAddress = await findAssociatedTokenAddress({
    solanaWalletKey,
    mintKey,
    solanaTokenProgramKey
  })

  const accounts = [
    {
      pubkey: feePayerKey,
      isSigner: true,
      isWritable: true
    },
    {
      pubkey: associatedTokenAddress,
      isSigner: false,
      isWritable: true
    },
    {
      pubkey: solanaWalletKey,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: mintKey,
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
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false
    }
  ]

  const { blockhash } = await connection.getLatestBlockhash()

  const transactionData = {
    recentBlockhash: blockhash,
    instructions: [
      {
        keys: accounts.map((account) => {
          return {
            pubkey: account.pubkey.toString(),
            isSigner: account.isSigner,
            isWritable: account.isWritable
          }
        }),
        programId: ASSOCIATED_TOKEN_PROGRAM_ID.toString(),
        data: Buffer.from([])
      }
    ]
  }

  const response = await identityService?.solanaRelay(transactionData)
  return response
}
