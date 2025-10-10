# Reward Manager Scripts

This directory contains utility scripts for working with the Reward Manager Solana program.

## Prerequisites

```bash
# Install dependencies from the spl package root
cd packages/spl
npm install

# Make sure you have ts-node installed globally (optional)
npm install -g ts-node typescript
```

## Scripts

### `initRewardManager.ts`

Initialize a new Reward Manager program on Solana.

#### Quick Start

```bash
# Run from packages/spl directory
npm run init-reward-manager -- \
  --payer ~/.config/solana/id.json \
  --manager ./manager-keypair.json \
  --mint 9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM
```

#### Usage

```bash
ts-node scripts/initRewardManager.ts [OPTIONS]
```

#### Required Options

- `--payer, -p <PATH>` - Path to payer keypair JSON file
- `--manager, -m <PATH>` - Path to manager keypair JSON file
- `--mint <ADDRESS>` - Mint address for reward token (e.g., AUDIO)

#### Optional Options

- `--min-votes <NUMBER>` - Minimum votes required (default: 3)
- `--cluster, -c <CLUSTER>` - Cluster: devnet, testnet, mainnet-beta, or custom URL (default: devnet)
- `--reward-manager-keypair <PATH>` - Use existing reward manager keypair (generates new if omitted)
- `--token-account-keypair <PATH>` - Use existing token account keypair (generates new if omitted)
- `--help, -h` - Show help message

#### Examples

**Initialize on devnet with minimum config:**

```bash
npm run init-reward-manager -- \
  --payer ~/.config/solana/id.json \
  --manager ./manager-keypair.json \
  --mint 9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM
```

**Initialize on mainnet with 5 required votes:**

```bash
npm run init-reward-manager -- \
  --payer ~/.config/solana/id.json \
  --manager ./manager-keypair.json \
  --mint 9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM \
  --min-votes 5 \
  --cluster mainnet-beta
```

**Use pre-generated keypairs:**

```bash
npm run init-reward-manager -- \
  --payer ~/.config/solana/id.json \
  --manager ./manager-keypair.json \
  --mint 9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM \
  --reward-manager-keypair ./reward-manager.json \
  --token-account-keypair ./token-account.json
```

**Use custom RPC endpoint:**

```bash
npm run init-reward-manager -- \
  --payer ~/.config/solana/id.json \
  --manager ./manager-keypair.json \
  --mint 9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM \
  --cluster https://api.custom-rpc.com
```

#### Keypair File Format

The script accepts keypair files in standard Solana format (array of 64 bytes):

```json
[1,2,3,4,...,64]
```

Or object format:

```json
{
  "secretKey": [1,2,3,4,...,64]
}
```

#### Output

The script will:

1. ✅ Validate all inputs
2. ✅ Check payer balance
3. ✅ Calculate rent-exempt amounts
4. ✅ Create the reward manager account
5. ✅ Create the token account
6. ✅ Initialize the reward manager
7. ✅ Display all addresses and signature
8. ✅ Save generated keypairs to files (if not provided)

Example output:

```
🚀 Initializing Reward Manager...

📡 Connecting to https://api.devnet.solana.com
🔑 Loading keypairs...
   Payer: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
   Manager: 9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
   Payer balance: 2.5 SOL
   Reward Manager: ABC123... (new)
   Token Account: DEF456... (new)
   Mint: 9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM
   Min Votes: 3

💰 Calculating rent...
   Reward Manager: 0.00143232 SOL
   Token Account: 0.00203928 SOL
   Total: 0.0034716 SOL

🔨 Building transaction...
   ✓ Added create reward manager account instruction
   ✓ Added create token account instruction
   ✓ Added init reward manager instruction

📤 Sending transaction...

✅ Success!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Signature:        5Jqw...xyz
Reward Manager:   ABC123...
Token Account:    DEF456...
Manager:          9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
Mint:             9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM
Min Votes:        3
Cluster:          devnet
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Derived Addresses:
Authority PDA:    GHI789...

💾 Saved reward manager keypair to: reward-manager-1234567890.json
💾 Saved token account keypair to: token-account-1234567890.json

🔗 View transaction: https://explorer.solana.com/tx/5Jqw...xyz?cluster=devnet
```

## Generating Keypairs

If you need to generate keypairs for testing:

```bash
# Generate a keypair
solana-keygen new --outfile ./my-keypair.json --no-bip39-passphrase

# Or use Node.js
node -e "const {Keypair} = require('@solana/web3.js'); const kp = Keypair.generate(); require('fs').writeFileSync('keypair.json', JSON.stringify(Array.from(kp.secretKey)))"
```

## Troubleshooting

### "Payer has no balance"

Fund your payer account:

```bash
# For devnet
solana airdrop 2 <PAYER_ADDRESS> --url devnet

# For testnet
solana airdrop 2 <PAYER_ADDRESS> --url testnet
```

### "Keypair file not found"

Make sure the path is correct. Use absolute paths if relative paths aren't working:

```bash
--payer /Users/yourname/.config/solana/id.json
```

### "Invalid keypair format"

Ensure your keypair file is valid JSON in one of the supported formats.

### "Account already exists"

If you're reusing keypairs and they're already initialized, generate new ones or use different keypairs.

## Contributing

When adding new scripts:

1. Add them to this directory
2. Update this README
3. Add npm scripts to `package.json` if appropriate
4. Follow the same patterns for argument parsing and error handling
