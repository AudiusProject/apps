# Init Instruction Example

> **Quick Start**: For a ready-to-run script, see [`../../QUICKSTART.md`](../../QUICKSTART.md) or [`../../scripts/initRewardManager.ts`](../../scripts/initRewardManager.ts)

Here's how to use the newly implemented `Init` instruction to initialize a Reward Manager program:

```typescript
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { RewardManagerProgram } from '@audius/spl'

async function initializeRewardManager() {
  const connection = new Connection('https://api.devnet.solana.com')
  const payer = Keypair.fromSecretKey(/* your keypair */)
  const manager = Keypair.fromSecretKey(/* manager keypair */)

  // Create new accounts
  const rewardManager = Keypair.generate()
  const tokenAccount = Keypair.generate()

  // The mint for the rewards token (e.g., AUDIO token)
  const mint = new PublicKey('9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM')

  // Minimum number of discovery node attestations required
  const minVotes = 3

  // Get rent-exempt minimums
  const rewardManagerRent = await connection.getMinimumBalanceForRentExemption(
    /* RewardManager size */ 74
  )
  const tokenAccountRent = await connection.getMinimumBalanceForRentExemption(
    165 // Token Account size
  )

  // Create the transaction
  const transaction = new Transaction()

  // 1. Create the reward manager account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: rewardManager.publicKey,
      lamports: rewardManagerRent,
      space: 74, // RewardManager::LEN
      programId: RewardManagerProgram.programId
    })
  )

  // 2. Create the token account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: tokenAccount.publicKey,
      lamports: tokenAccountRent,
      space: 165, // Token Account size
      programId: TOKEN_PROGRAM_ID
    })
  )

  // 3. Initialize the reward manager
  transaction.add(
    RewardManagerProgram.createInitInstruction({
      rewardManager: rewardManager.publicKey,
      tokenAccount: tokenAccount.publicKey,
      mint,
      manager: manager.publicKey,
      minVotes
    })
  )

  // Send and confirm
  const signature = await connection.sendTransaction(
    transaction,
    [payer, rewardManager, tokenAccount],
    { skipPreflight: false }
  )

  console.log('Reward Manager initialized!')
  console.log('Signature:', signature)
  console.log('Reward Manager:', rewardManager.publicKey.toBase58())
  console.log('Token Account:', tokenAccount.publicKey.toBase58())

  // Decode the instruction
  const instructions = transaction.instructions
  const initInstruction = instructions[2]
  const decoded = RewardManagerProgram.decodeInstruction(initInstruction)

  if (RewardManagerProgram.isInitInstruction(decoded)) {
    console.log('Decoded Init instruction:')
    console.log('  Min votes:', decoded.data.minVotes)
    console.log(
      '  Reward Manager:',
      decoded.keys.rewardManager.pubkey.toBase58()
    )
    console.log('  Manager:', decoded.keys.manager.pubkey.toBase58())
  }
}

// Run the example
initializeRewardManager().catch(console.error)
```

## What the Init Instruction Does

The `Init` instruction:

1. **Initializes the Reward Manager State** - Sets up the main program state with:

   - Token account for holding rewards
   - Manager authority who can create/delete senders
   - Minimum number of validator votes required for disbursement

2. **Initializes the Token Account** - Sets up an SPL token account to hold the reward tokens

3. **Derives the Authority PDA** - Automatically calculates the program-derived address that will own sender accounts and sign token transfers

## Key Parameters

- **rewardManager**: The account to store the program state
- **tokenAccount**: The SPL token account to hold reward tokens
- **mint**: The mint of the reward token (e.g., AUDIO)
- **manager**: The admin who can create/delete senders
- **minVotes**: Number of discovery node attestations required (typically 3)

## Comparison with Rust CLI

This matches the Rust CLI `init` command:

```bash
reward-manager-cli init \
  --token-mint <MINT> \
  --min-votes 3 \
  --keypair <REWARD_MANAGER_KEYPAIR> \
  --token-keypair <TOKEN_ACCOUNT_KEYPAIR>
```

See: `solana-programs/reward-manager/cli/src/main.rs` lines 69-134
