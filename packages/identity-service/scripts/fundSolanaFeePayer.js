// Script usage
// node fundSolanaFeePayer path-to-relayer-config.json queryRelayerBalances|fundRelayers <optional amount to transfer in SOL>

/*
Expected format of prod-sol-relayer-config.json
{
  "funderPrivateKey": [134,232,...],
  "relayerWallets": [{
    "privateKey": [34,323,...]
  },{
    "privateKey": [....]
  },
  ...]
}
*/
const path = require('path')
const solanaWeb3 = require('@solana/web3.js')

// constants
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com' // DEVNET is https://api.devnet.solana.com

// validation
const args = process.argv
if (
  args.length < 3 &&
  !['fundRelayers', 'queryRelayerBalances'].includes(args[3])
) {
  _throwArgError()
}
const SOL_RELAYER_INFO = require(path.join(__dirname, args[2]))
const SCRIPT_ACTION = args[3]
const MIN_BALANCE = args[4] * solanaWeb3.LAMPORTS_PER_SOL

const getSolFromLamports = (lamports) => {
  return lamports / solanaWeb3.LAMPORTS_PER_SOL
}

const getSolConstants = () => {
  const solProdRelayerInfo = SOL_RELAYER_INFO
  const connection = new solanaWeb3.Connection(RPC_ENDPOINT)
  return {
    solProdRelayerInfo,
    connection
  }
}

const queryRelayerBalances = async () => {
  const { solProdRelayerInfo, connection } = getSolConstants()
  console.log(solProdRelayerInfo)
  const funderPkey = solProdRelayerInfo.funderPrivateKey
  const funderKeypair = solanaWeb3.Keypair.fromSecretKey(
    Uint8Array.from(funderPkey)
  )

  // Retrieve funder
  const funderBalance = await connection.getBalance(funderKeypair.publicKey)
  console.log(`Minimum Sol Per Relayer = ${getSolFromLamports(MIN_BALANCE)}`)
  console.log(
    `FunderWallet = ${funderKeypair.publicKey}, Balance=${funderBalance}`
  )

  // retrieve relayer wallets
  const relayerKeypairs = []
  const relayerPkeys = solProdRelayerInfo.relayerWallets

  for (const relayerPkey of relayerPkeys) {
    relayerKeypairs.push(
      solanaWeb3.Keypair.fromSecretKey(Uint8Array.from(relayerPkey.privateKey))
    )
  }

  const belowMinimumBalanceRelayers = []
  for (const relayerKeypair of relayerKeypairs) {
    const relayerBal = await connection.getBalance(relayerKeypair.publicKey)
    const diffInSol = getSolFromLamports(MIN_BALANCE - relayerBal)
    console.log(
      `RelayerWallet=${relayerKeypair.publicKey}, Balance=${getSolFromLamports(relayerBal)} SOL, diff=${diffInSol} SOL`
    )
    if (relayerBal < MIN_BALANCE) {
      belowMinimumBalanceRelayers.push(relayerKeypair)
    }
  }

  return {
    funderKeypair,
    relayerKeypairs,
    belowMinimumBalanceRelayers
  }
}

const fundRelayers = async () => {
  const { connection } = getSolConstants()
  const { funderKeypair, belowMinimumBalanceRelayers } =
    await queryRelayerBalances()

  for (const relayerToFund of belowMinimumBalanceRelayers) {
    console.log(`-------- Balances before transferring --------`)
    console.log(
      `Fee payer balance: ${(await connection.getBalance(funderKeypair.publicKey)) / solanaWeb3.LAMPORTS_PER_SOL}`
    )
    console.log(
      `Funder balance: ${(await connection.getBalance(relayerToFund.publicKey)) / solanaWeb3.LAMPORTS_PER_SOL}`
    )
    console.log(`Funding ${relayerToFund.publicKey} ${MIN_BALANCE} lamports`)
    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: funderKeypair.publicKey,
        toPubkey: relayerToFund.publicKey,
        lamports: MIN_BALANCE
      })
    )
    const signature = await solanaWeb3.sendAndConfirmTransaction(
      connection,
      transaction,
      [funderKeypair],
      {
        commitment: 'finalized'
      }
    )
    console.log(
      `Transfer from ${funderKeypair.publicKey} to ${relayerToFund.publicKey} signature=${signature}`
    )
    console.log(`-------- Balances after transferring --------`)
    console.log(
      `Fee payer balance: ${(await connection.getBalance(relayerToFund.publicKey)) / solanaWeb3.LAMPORTS_PER_SOL}`
    )
    console.log(
      `Funder balance: ${(await connection.getBalance(funderKeypair.publicKey)) / solanaWeb3.LAMPORTS_PER_SOL}`
    )
  }
}

function _throwArgError() {
  throw new Error(
    'missing argument - format: node fundSolanaFeePayer path-to-relayer-config.json queryRelayerBalances|fundRelayers <optional amount to transfer in SOL>'
  )
}

async function run() {
  try {
    switch (SCRIPT_ACTION) {
      case 'fundRelayers':
        await fundRelayers()
        break
      case 'queryRelayerBalances':
        await queryRelayerBalances()
        break
      default:
        throw new Error('Invalid argument')
    }
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
  process.exit(0)
}

run()
