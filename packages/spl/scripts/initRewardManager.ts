#!/usr/bin/env ts-node

/**
 * Initialize a Reward Manager program
 *
 * Usage:
 *   ts-node scripts/initRewardManager.ts \
 *     --payer ./keypair.json \
 *     --manager ./manager.json \
 *     --mint 9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM \
 *     --min-votes 3 \
 *     --cluster devnet
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl
} from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { RewardManagerProgram } from '../src/reward-manager/RewardManagerProgram'
import * as fs from 'fs'
import * as path from 'path'

// Constants
const REWARD_MANAGER_SIZE = 66 // 1 (version) + 32 (token_account) + 32 (manager) + 1 (min_votes)
const TOKEN_ACCOUNT_SIZE = 165

interface ScriptArgs {
  payer: string
  manager: string
  mint: string
  minVotes: number
  cluster: 'devnet' | 'testnet' | 'mainnet-beta' | string
  rewardManagerKeypair?: string
  tokenAccountKeypair?: string
}

/**
 * Load a keypair from a JSON file
 */
function loadKeypair(filepath: string): Keypair {
  const resolvedPath = path.resolve(filepath)
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Keypair file not found: ${resolvedPath}`)
  }

  const keypairData = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'))

  // Handle both array format and object format
  let secretKey: Uint8Array
  if (Array.isArray(keypairData)) {
    secretKey = Uint8Array.from(keypairData)
  } else if (keypairData.secretKey) {
    secretKey = Uint8Array.from(keypairData.secretKey)
  } else {
    throw new Error(`Invalid keypair format in ${filepath}`)
  }

  return Keypair.fromSecretKey(secretKey)
}

/**
 * Parse command line arguments
 */
function parseArgs(): ScriptArgs {
  const args = process.argv.slice(2)
  const parsed: Partial<ScriptArgs> = {
    cluster: 'devnet',
    minVotes: 3
  }

  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i]
    const value = args[i + 1]

    switch (flag) {
      case '--payer':
      case '-p':
        parsed.payer = value
        break
      case '--manager':
      case '-m':
        parsed.manager = value
        break
      case '--mint':
        parsed.mint = value
        break
      case '--min-votes':
        parsed.minVotes = parseInt(value, 10)
        break
      case '--cluster':
      case '-c':
        parsed.cluster = value as ScriptArgs['cluster']
        break
      case '--reward-manager-keypair':
        parsed.rewardManagerKeypair = value
        break
      case '--token-account-keypair':
        parsed.tokenAccountKeypair = value
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
      default:
        console.error(`Unknown flag: ${flag}`)
        printHelp()
        process.exit(1)
    }
  }

  // Validate required args
  if (!parsed.payer || !parsed.manager || !parsed.mint) {
    console.error('Missing required arguments\n')
    printHelp()
    process.exit(1)
  }

  return parsed as ScriptArgs
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Initialize a Reward Manager program

USAGE:
  ts-node scripts/initRewardManager.ts [OPTIONS]

REQUIRED OPTIONS:
  --payer, -p <PATH>              Path to payer keypair JSON file
  --manager, -m <PATH>            Path to manager keypair JSON file
  --mint <ADDRESS>                Mint address for reward token

OPTIONAL:
  --min-votes <NUMBER>            Minimum votes required (default: 3)
  --cluster, -c <CLUSTER>         Cluster to use: devnet, testnet, mainnet-beta, or custom URL
                                  (default: devnet)
  --reward-manager-keypair <PATH> Use existing reward manager keypair (generates new if omitted)
  --token-account-keypair <PATH>  Use existing token account keypair (generates new if omitted)
  --help, -h                      Show this help message

EXAMPLES:
  # Initialize with minimum config
  ts-node scripts/initRewardManager.ts \\
    --payer ~/.config/solana/id.json \\
    --manager ./manager-keypair.json \\
    --mint 9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM

  # Initialize with custom cluster and votes
  ts-node scripts/initRewardManager.ts \\
    --payer ~/.config/solana/id.json \\
    --manager ./manager-keypair.json \\
    --mint 9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM \\
    --min-votes 5 \\
    --cluster mainnet-beta

  # Use existing reward manager and token account keypairs
  ts-node scripts/initRewardManager.ts \\
    --payer ~/.config/solana/id.json \\
    --manager ./manager-keypair.json \\
    --mint 9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM \\
    --reward-manager-keypair ./reward-manager.json \\
    --token-account-keypair ./token-account.json
  `)
}

/**
 * Main script
 */
async function main() {
  console.log('🚀 Initializing Reward Manager...\n')

  // Parse arguments
  const args = parseArgs()

  // Setup connection
  const rpcUrl = ['devnet', 'testnet', 'mainnet-beta'].includes(args.cluster)
    ? clusterApiUrl(args.cluster as 'devnet' | 'testnet' | 'mainnet-beta')
    : args.cluster

  console.log(`📡 Connecting to ${rpcUrl}`)
  const connection = new Connection(rpcUrl, 'confirmed')

  // Load keypairs
  console.log('🔑 Loading keypairs...')
  const payer = loadKeypair(args.payer)
  const manager = loadKeypair(args.manager)
  console.log(`   Payer: ${payer.publicKey.toBase58()}`)
  console.log(`   Manager: ${manager.publicKey.toBase58()}`)

  // Check payer balance
  const payerBalance = await connection.getBalance(payer.publicKey)
  console.log(`   Payer balance: ${payerBalance / 1e9} SOL`)
  if (payerBalance === 0) {
    throw new Error('Payer has no balance. Please fund the account first.')
  }

  // Generate or load reward manager and token account keypairs
  const rewardManager = args.rewardManagerKeypair
    ? loadKeypair(args.rewardManagerKeypair)
    : Keypair.generate()

  const tokenAccount = args.tokenAccountKeypair
    ? loadKeypair(args.tokenAccountKeypair)
    : Keypair.generate()

  console.log(
    `   Reward Manager: ${rewardManager.publicKey.toBase58()} ${args.rewardManagerKeypair ? '(existing)' : '(new)'}`
  )
  console.log(
    `   Token Account: ${tokenAccount.publicKey.toBase58()} ${args.tokenAccountKeypair ? '(existing)' : '(new)'}`
  )

  // Parse mint
  const mint = new PublicKey(args.mint)
  console.log(`   Mint: ${mint.toBase58()}`)
  console.log(`   Min Votes: ${args.minVotes}\n`)

  // Get rent-exempt minimums
  console.log('💰 Calculating rent...')
  const rewardManagerRent =
    await connection.getMinimumBalanceForRentExemption(REWARD_MANAGER_SIZE)
  const tokenAccountRent =
    await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE)
  const totalRent = rewardManagerRent + tokenAccountRent
  console.log(`   Reward Manager: ${rewardManagerRent / 1e9} SOL`)
  console.log(`   Token Account: ${tokenAccountRent / 1e9} SOL`)
  console.log(`   Total: ${totalRent / 1e9} SOL\n`)

  // Build transaction
  console.log('🔨 Building transaction...')
  const transaction = new Transaction()

  // 1. Create reward manager account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: rewardManager.publicKey,
      lamports: rewardManagerRent,
      space: REWARD_MANAGER_SIZE,
      programId: RewardManagerProgram.programId
    })
  )
  console.log('   ✓ Added create reward manager account instruction')

  // 2. Create token account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: tokenAccount.publicKey,
      lamports: tokenAccountRent,
      space: TOKEN_ACCOUNT_SIZE,
      programId: TOKEN_PROGRAM_ID
    })
  )
  console.log('   ✓ Added create token account instruction')

  // 3. Initialize reward manager
  const initInstruction = RewardManagerProgram.createInitInstruction({
    rewardManager: rewardManager.publicKey,
    tokenAccount: tokenAccount.publicKey,
    mint,
    manager: manager.publicKey,
    minVotes: args.minVotes
  })

  // Debug: Show the derived authority and all accounts
  const derivedAuthority = RewardManagerProgram.deriveAuthority({
    programId: RewardManagerProgram.programId,
    rewardManagerState: rewardManager.publicKey
  })
  console.log(`\n   🔍 Debug Information:`)
  console.log(`      Program ID: ${RewardManagerProgram.programId.toBase58()}`)
  console.log(`      Reward Manager: ${rewardManager.publicKey.toBase58()}`)
  console.log(`      Token Account: ${tokenAccount.publicKey.toBase58()}`)
  console.log(`      Mint: ${mint.toBase58()}`)
  console.log(`      Manager: ${manager.publicKey.toBase58()}`)
  console.log(`      Derived Authority: ${derivedAuthority.toBase58()}`)
  console.log(`      Min Votes: ${args.minVotes}`)

  console.log(`\n   📝 Init Instruction Accounts (in order):`)
  initInstruction.keys.forEach((key, idx) => {
    console.log(
      `      ${idx}: ${key.pubkey.toBase58()} (${key.isWritable ? 'writable' : 'readonly'}${key.isSigner ? ', signer' : ''})`
    )
  })
  console.log(
    `   📦 Instruction Data (hex): ${initInstruction.data.toString('hex')}`
  )

  transaction.add(initInstruction)
  console.log('\n   ✓ Added init reward manager instruction\n')

  // Send and confirm transaction
  console.log('📤 Sending transaction...')
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, rewardManager, tokenAccount],
    {
      commitment: 'confirmed',
      skipPreflight: false
    }
  )

  console.log('\n✅ Success!\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 Results:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Signature:        ${signature}`)
  console.log(`Reward Manager:   ${rewardManager.publicKey.toBase58()}`)
  console.log(`Token Account:    ${tokenAccount.publicKey.toBase58()}`)
  console.log(`Manager:          ${manager.publicKey.toBase58()}`)
  console.log(`Mint:             ${mint.toBase58()}`)
  console.log(`Min Votes:        ${args.minVotes}`)
  console.log(`Cluster:          ${args.cluster}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Derive and display authority
  const authority = RewardManagerProgram.deriveAuthority({
    programId: RewardManagerProgram.programId,
    rewardManagerState: rewardManager.publicKey
  })
  console.log('📍 Derived Addresses:')
  console.log(`Authority PDA:    ${authority.toBase58()}\n`)

  // Save keypairs if they were generated
  if (!args.rewardManagerKeypair) {
    const filename = `reward-manager-${Date.now()}.json`
    fs.writeFileSync(
      filename,
      JSON.stringify(Array.from(rewardManager.secretKey))
    )
    console.log(`💾 Saved reward manager keypair to: ${filename}`)
  }

  if (!args.tokenAccountKeypair) {
    const filename = `token-account-${Date.now()}.json`
    fs.writeFileSync(
      filename,
      JSON.stringify(Array.from(tokenAccount.secretKey))
    )
    console.log(`💾 Saved token account keypair to: ${filename}`)
  }

  console.log(
    `\n🔗 View transaction: https://explorer.solana.com/tx/${signature}?cluster=${args.cluster}`
  )
}

// Run the script
main().catch((error) => {
  console.error('\n❌ Error:', error.message)
  if (error.logs) {
    console.error('\n📋 Program logs:')
    error.logs.forEach((log: string) => console.error(`   ${log}`))
  }
  process.exit(1)
})
