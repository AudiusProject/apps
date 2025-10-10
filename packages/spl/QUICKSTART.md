# Quick Start: Initialize Reward Manager

This guide will help you initialize a Reward Manager program on Solana.

## Prerequisites

1. **Node.js & npm** installed
2. **Solana CLI** installed (for generating keypairs and airdrops)
3. **Funded wallet** with SOL

## Step-by-Step Guide

### 1. Install Dependencies

```bash
cd packages/spl
npm install
```

### 2. Generate Keypairs

You'll need two keypairs:

- **Payer**: Pays for transactions and account creation
- **Manager**: Admin account that can manage senders

```bash
# Generate payer keypair (or use existing ~/.config/solana/id.json)
solana-keygen new --outfile ./payer.json --no-bip39-passphrase

# Generate manager keypair
solana-keygen new --outfile ./manager.json --no-bip39-passphrase
```

### 3. Fund Your Payer (Devnet)

```bash
# Get your payer address
solana-keygen pubkey ./payer.json

# Airdrop SOL
solana airdrop 2 <PAYER_ADDRESS> --url devnet

# Check balance
solana balance <PAYER_ADDRESS> --url devnet
```

### 4. Run the Init Script

```bash
npm run init-reward-manager -- \
  --payer ./payer.json \
  --manager ./manager.json \
  --mint 9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM \
  --min-votes 3 \
  --cluster devnet
```

### 5. Save the Output

The script will output important addresses. **Save these!**

```
Reward Manager:   ABC123...  ← Save this!
Token Account:    DEF456...  ← Save this!
Authority PDA:    GHI789...  ← Save this!
```

The script also automatically saves generated keypairs to files:

- `reward-manager-<timestamp>.json`
- `token-account-<timestamp>.json`

## Common Use Cases

### Devnet Testing

```bash
npm run init-reward-manager -- \
  --payer ~/.config/solana/id.json \
  --manager ./manager.json \
  --mint 9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM \
  --cluster devnet
```

### Mainnet Deployment

```bash
npm run init-reward-manager -- \
  --payer ./mainnet-payer.json \
  --manager ./mainnet-manager.json \
  --mint 9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM \
  --min-votes 5 \
  --cluster mainnet-beta
```

### With Pre-Generated Accounts

```bash
npm run init-reward-manager -- \
  --payer ./payer.json \
  --manager ./manager.json \
  --mint 9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM \
  --reward-manager-keypair ./reward-manager.json \
  --token-account-keypair ./token-account.json \
  --cluster devnet
```

## What Gets Created?

1. **Reward Manager Account** - Stores program state:

   - Token account reference
   - Manager authority
   - Minimum votes required

2. **Token Account** - SPL token account that holds reward tokens

3. **Authority PDA** - Program-derived address that:
   - Owns sender accounts
   - Signs token transfers
   - Cannot be controlled by any private key

## Next Steps

After initialization, you can:

1. **Fund the Token Account** - Transfer reward tokens to the token account
2. **Create Senders** - Add discovery nodes as authorized attestors
3. **Submit Attestations** - Have senders attest to reward eligibility
4. **Disburse Rewards** - Evaluate attestations and transfer tokens

See the main [README](./README.md) for more information on these operations.

## Troubleshooting

### Error: "Payer has no balance"

```bash
# Check balance
solana balance ./payer.json --url devnet

# Request airdrop
solana airdrop 2 $(solana-keygen pubkey ./payer.json) --url devnet
```

### Error: "Keypair file not found"

Make sure you're running from the correct directory and the file paths are correct.

```bash
# Use absolute paths if needed
npm run init-reward-manager -- \
  --payer /Users/yourname/payer.json \
  --manager /Users/yourname/manager.json \
  --mint 9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM
```

### Error: "Account already exists"

The reward manager or token account keypair is already initialized. Use different keypairs or generate new ones.

### View Transaction Details

Check the Solana Explorer link printed at the end:

```
🔗 View transaction: https://explorer.solana.com/tx/<SIGNATURE>?cluster=devnet
```

## Help

For more options:

```bash
npm run init-reward-manager -- --help
```

For detailed documentation, see [scripts/README.md](./scripts/README.md).
