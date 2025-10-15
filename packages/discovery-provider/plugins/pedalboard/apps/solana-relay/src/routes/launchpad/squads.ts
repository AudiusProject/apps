import { Wallet } from '@coral-xyz/anchor'
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  Signer
} from '@solana/web3.js'
import Squads from '@sqds/sdk'
import bs58 from 'bs58'

import { config } from '../../config'

export async function sendTransactionWithSquads(params: {
  connection: Connection
  instructions: TransactionInstruction[]
  feePayer?: PublicKey
  signers?: Signer[]
}): Promise<{ transactionPda: string }> {
  const { connection, instructions, feePayer, signers } = params

  if (!config.launchpadConfigKey) {
    throw new Error('Missing launchpadConfigKey (Squads multisig address)')
  }
  if (!config.launchpadPartnerPrivateKey) {
    throw new Error('Missing launchpadPartnerPrivateKey (Squads member secret)')
  }

  const multisig = new PublicKey(config.launchpadConfigKey)

  const member = Keypair.fromSecretKey(
    bs58.decode(config.launchpadPartnerPrivateKey)
  )

  const authorityIndex = 1

  const squads = Squads.endpoint(connection.rpcEndpoint, new Wallet(member))

  // Ensure the multisig exists
  const ms = await squads.getMultisig(multisig)
  if (!ms) {
    throw new Error('Multisig not found or not a Squads smart wallet')
  }

  const txAccount = await squads.createTransaction(multisig, authorityIndex)
  for (const ix of instructions) {
    await squads.addInstruction(txAccount.publicKey, ix)
  }

  await squads.activateTransaction(txAccount.publicKey)
  await squads.approveTransaction(txAccount.publicKey)
  await squads.executeTransaction(txAccount.publicKey, feePayer, signers)

  return { transactionPda: txAccount.publicKey.toBase58() }
}
