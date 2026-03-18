import { Connection, PublicKey } from '@solana/web3.js'

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed')
const owner = new PublicKey('8xcY9gsu2j5YUsjWSZ4YTNHN23L2yvqG98F8iXZ8u8sp')
const NATIVE_MINT = new PublicKey('So11111111111111111111111111111111111111112')

async function check() {
  // Native SOL on the wallet itself
  const lamports = await connection.getBalance(owner, 'confirmed')
  console.log('SOL lamports:', lamports)
  console.log('SOL:', lamports / 1e9)

  // All wSOL token accounts owned by the wallet
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    owner,
    { mint: NATIVE_MINT },
    'confirmed'
  )

  console.log('wSOL token accounts:', tokenAccounts.value.length)

  for (const acc of tokenAccounts.value) {
    const parsed = acc.account.data.parsed.info
    console.log({
      tokenAccount: acc.pubkey.toBase58(),
      amount: parsed.tokenAmount.amount,
      uiAmount: parsed.tokenAmount.uiAmountString,
      isNative: parsed.isNative,
      state: parsed.state
    })
  }
}

check().catch(console.error)
