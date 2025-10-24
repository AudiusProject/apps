import { readFileSync } from 'fs'
import path from 'path'

import { RewardManagerProgram } from '@audius/spl'
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  AddressLookupTableProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TransactionMessage,
  VersionedTransaction,
  type Connection
} from '@solana/web3.js'
import { program } from 'commander'
import untildify from 'untildify'

import { developmentConfig } from '../config/development'
import { productionConfig } from '../config/production'
import { stagingConfig } from '../config/staging'
import type { SdkServicesConfig } from '../config/types'
import { sdk as audiusSdk } from '../sdk'
import { Logger } from '../services'
import type { SdkConfig } from '../types'

/**
 * Derives the sender addresses for Validators and Anti Abuse Oracles
 * for the given config.
 */
const getSenders = async (config: SdkServicesConfig) => {
  const rewardManagerState = new PublicKey(
    config.solana.rewardManagerStateAddress
  )
  const rewardManagerProgramId = new PublicKey(
    config.solana.rewardManagerProgramAddress
  )
  const rewardManagerAuthority = RewardManagerProgram.deriveAuthority({
    programId: rewardManagerProgramId,
    rewardManagerState
  })

  const oracleSenders =
    config.network.antiAbuseOracleNodes.registeredAddresses.map(
      (ethAddress) => ({
        ethAddress,
        sender: RewardManagerProgram.deriveSender({
          ethAddress,
          programId: rewardManagerProgramId,
          authority: rewardManagerAuthority
        }).toBase58()
      })
    )

  const storageSenders = config.network.storageNodes.map((node) => ({
    ...node,
    sender: RewardManagerProgram.deriveSender({
      ethAddress: node.delegateOwnerWallet,
      programId: rewardManagerProgramId,
      authority: rewardManagerAuthority
    }).toBase58()
  }))

  return {
    validatorSenders: [...storageSenders],
    oracleSenders
  }
}

/**
 * Extends existing lookup table with the addresses given, submitting in batches
 */
const extendLookupTable = async ({
  addresses,
  lookupTableAddress,
  payer,
  authority,
  connection
}: {
  addresses: PublicKey[]
  lookupTableAddress: PublicKey
  payer: Keypair
  authority: PublicKey
  connection: Connection
}) => {
  while (addresses.length > 0) {
    const batch = addresses.splice(0, 20)
    console.info(
      'Extending',
      lookupTableAddress.toBase58(),
      'with',
      batch.length,
      'new senders...'
    )
    const extendInstruction = AddressLookupTableProgram.extendLookupTable({
      lookupTable: lookupTableAddress,
      payer: payer.publicKey,
      authority,
      addresses: batch
    })
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash()
    const transaction = new VersionedTransaction(
      new TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: blockhash,
        instructions: [extendInstruction]
      }).compileToV0Message()
    )
    transaction.sign([payer])
    const signature = await connection.sendTransaction(transaction)
    console.info('Confirming...')
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    })
    console.info('Confirmed.')
  }
}

/**
 * Get the proper config for the given environment
 */
const getConfig = (environment: SdkConfig['environment']) => {
  const config =
    environment === 'development'
      ? developmentConfig
      : environment === 'staging'
      ? stagingConfig
      : productionConfig
  return config
}

/**
 * Creates the lookup table for the given environment with the given keypair as
 * both payer and authority.
 *
 * After running, be sure to update `generateServicesConfig.ts` with the address
 * f the lookup table.
 */
const createLookupTable = async ({
  environment,
  keypair
}: {
  environment: SdkConfig['environment']
  keypair: string
}) => {
  console.info(
    'Creating rewards lookup table for',
    environment,
    'using keypair',
    keypair
  )
  const wallet = Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        readFileSync(
          path.resolve(untildify(keypair ?? '~/.config/solana/id.json')),
          { encoding: 'utf-8' }
        )
      )
    )
  )
  const sdk = audiusSdk({
    appName: 'generate-rewards-lookup-table',
    environment,
    services: {
      logger: new Logger()
    }
  })
  const config = getConfig(environment)
  const connection = sdk.services.solanaClient.connection

  const rewardManagerState = new PublicKey(
    config.solana.rewardManagerStateAddress
  )
  const rewardManagerProgramId = new PublicKey(
    config.solana.rewardManagerProgramAddress
  )
  const rewardManagerAuthority = RewardManagerProgram.deriveAuthority({
    programId: rewardManagerProgramId,
    rewardManagerState
  })
  const rewardManagerTokenSource = (
    await sdk.services.rewardManagerClient.getRewardManagerState()
  ).tokenAccount

  const addresses = [
    SystemProgram.programId,
    SYSVAR_RENT_PUBKEY,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    rewardManagerState,
    rewardManagerAuthority,
    rewardManagerTokenSource
  ]

  const payer = wallet.publicKey
  const authority = wallet.publicKey

  const slot = await connection.getSlot()
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash()
  const [createLookupTableInstruction, lookupTableAddress] =
    AddressLookupTableProgram.createLookupTable({
      authority,
      payer,
      recentSlot: slot - 1
    })
  const extendInstruction = AddressLookupTableProgram.extendLookupTable({
    lookupTable: lookupTableAddress,
    payer,
    authority,
    addresses
  })
  const transaction = new VersionedTransaction(
    new TransactionMessage({
      payerKey: payer,
      recentBlockhash: blockhash,
      instructions: [createLookupTableInstruction, extendInstruction]
    }).compileToV0Message()
  )
  transaction.sign([wallet])
  console.info(
    'Creating Lookup Table',
    lookupTableAddress.toBase58(),
    'with preset accounts...'
  )
  const signature = await connection.sendTransaction(transaction)
  console.info('Confirming...')
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight
  })
  console.info('Confirmed.')

  console.info('Adding senders...')
  const { validatorSenders, oracleSenders } = await getSenders(config)
  await extendLookupTable({
    connection,
    lookupTableAddress,
    payer: wallet,
    authority: wallet.publicKey,
    addresses: oracleSenders
      .map((node) => new PublicKey(node.sender))
      .concat(validatorSenders.map((node) => new PublicKey(node.sender)))
  })
}

/**
 * Updates the lookup table for the given environment using the keypair as both
 * the payer and the authority.
 *
 * The lookup table address is stored in the config generated by
 * `generateServicesConfig.ts`
 */
const updateLookupTable = async ({
  environment,
  keypair
}: {
  environment: SdkConfig['environment']
  keypair: string
}) => {
  console.info(
    'Updating rewards lookup table for',
    environment,
    'using keypair',
    keypair
  )
  const wallet = Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        readFileSync(
          path.resolve(untildify(keypair ?? '~/.config/solana/id.json')),
          { encoding: 'utf-8' }
        )
      )
    )
  )
  const sdk = audiusSdk({
    appName: 'generate-rewards-lookup-table',
    environment,
    services: {
      logger: new Logger()
    }
  })
  const config = getConfig(environment)
  const connection = sdk.services.solanaClient.connection

  const lookupTableAddress = sdk.services.rewardManagerClient.lookupTable
  const lookupTableAccount = await connection.getAddressLookupTable(
    lookupTableAddress
  )
  if (!lookupTableAccount.value) {
    console.warn(
      'Lookup table',
      lookupTableAddress.toBase58(),
      "does not exist. Create a new address lookup table using 'create', then update generateServicesConfig and regenerate the SDK config."
    )
    process.exit(1)
  }
  console.info(
    'Found lookup table',
    lookupTableAddress.toBase58(),
    'with',
    lookupTableAccount.value.state.addresses.length,
    'accounts.'
  )

  const existingAccounts = new Set(
    lookupTableAccount.value?.state.addresses.map((a) => a.toBase58())
  )
  const { validatorSenders, oracleSenders } = await getSenders(config)

  const oracleSendersToAdd = []
  for (const node of oracleSenders) {
    if (!existingAccounts.has(node.sender)) {
      oracleSendersToAdd.push(node.sender)
    }
  }
  console.info(
    'Found',
    oracleSendersToAdd.length,
    'new Anti Abuse Oracles to add:',
    oracleSendersToAdd.map((sender) =>
      oracleSenders.find((node) => node.sender === sender)
    )
  )

  const validatorSendersToAdd = []
  for (const node of validatorSenders) {
    if (!existingAccounts.has(node.sender)) {
      validatorSendersToAdd.push(node.sender)
    }
  }
  console.info(
    'Found',
    validatorSendersToAdd.length,
    'new Validators to add:',
    validatorSendersToAdd.map((sender) =>
      validatorSenders.find((node) => node.sender === sender)
    )
  )

  const allAddresses = [...oracleSendersToAdd, ...validatorSendersToAdd].map(
    (p) => new PublicKey(p)
  )

  await extendLookupTable({
    connection,
    lookupTableAddress,
    payer: wallet,
    authority: wallet.publicKey,
    addresses: allAddresses
  })
}

program
  .command('create')
  .description('Creates the lookup table for the specified environment.')
  .option(
    '-k,--keypair <pathToKeypairFile>',
    'Path to the keypair file to use as both payer and authority (default: ~/.config/solana/id.json',
    '~/.config/solana/id.json'
  )
  .option(
    '-e,--environment <environment>',
    'The environment of the lookup table',
    'production'
  )
  .action(async (args) => {
    await createLookupTable(args)
    process.exit(0)
  })

program
  .command('update')
  .description('Update the lookup table for the specified environment.')
  .option(
    '-k,--keypair <pathToKeypairFile>',
    'Path to the keypair file to use as both payer and authority (default: ~/.config/solana/id.json',
    '~/.config/solana/id.json'
  )
  .option(
    '-e,--environment <environment>',
    'The environment of the lookup table',
    'production'
  )
  .action(async (args) => {
    await updateLookupTable(args)
    process.exit(0)
  })

program.parseAsync()
