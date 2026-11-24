const axios = require('axios')
const Web3 = require('web3')
const solanaWeb3 = require('@solana/web3.js')
const { Keypair } = solanaWeb3
const {
  getSignedVAA,
  getEmitterAddressEth,
  parseSequenceFromLogEth,
  redeemOnSolana,
  postVaaSolana,
  CHAIN_ID_ETH
} = require('@certusone/wormhole-sdk')
const {
  setDefaultWasm
} = require('@certusone/wormhole-sdk/lib/cjs/solana/wasm.js')
const EthRewardManagerABI =
  require('../../eth-contracts/ABIs/EthRewardsManager.json').abi

const { grpc } = require('@improbable-eng/grpc-web')
const {
  NodeHttpTransport
} = require('@improbable-eng/grpc-web-node-http-transport')

grpc.setDefaultTransport(NodeHttpTransport())

setDefaultWasm('node')

const ETH_PROVIDER = process.env.ethProvider
const SOLANA_CLUSTER_ENDPOINT =
  process.env.solanaClusterEndpoint ||
  'https://carolina-8qh733-fast-mainnet.helius-rpc.com'
const ETH_BRIDGE_ADDRESS = '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B'
const SOL_BRIDGE_ADDRESS = 'worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth'
const ETH_TOKEN_BRIDGE_ADDRESS = '0x3ee18B2214AFF97000D974cf647E7C347E8fa585'
const SOL_TOKEN_BRIDGE_ADDRESS = 'wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb'

const WORMHOLE_RPC_HOSTS = [
  'https://wormhole-v2-mainnet-api.certus.one',
  'https://wormhole.inotel.ro',
  'https://wormhole-v2-mainnet-api.mcf.rocks',
  'https://wormhole-v2-mainnet-api.chainlayer.network',
  'https://wormhole-v2-mainnet-api.staking.fund',
  'https://wormhole-v2-mainnet-api.chainlayer.network'
]

const connection = new solanaWeb3.Connection(SOLANA_CLUSTER_ENDPOINT)

const NUM_RETRIES_RECEIPT = 5
const RETRY_DELAY_MS_RECEIPT = 1000

const NUM_RETRIES_VAA = 60
const RETRY_DELAY_MS_VAA = 5000

const ETH_REWARD_MANAGER_ADDRESS = '0x5aa6B99A2B461bA8E97207740f0A689C5C39C3b0'
const TEST_PRIVATE_KEY = process.env.testPrivateKey
const FEE_PAYER_SECRET_KEY = process.env.feePayerAddress

const feePayerSecretKey = Uint8Array.from(JSON.parse(FEE_PAYER_SECRET_KEY))
const feePayerKeypair = Keypair.fromSecretKey(feePayerSecretKey)
const feePayerPublicKey = feePayerKeypair.publicKey
const feePayerAddress = feePayerPublicKey.toString()

const web3 = new Web3(ETH_PROVIDER)
const ethAccount = web3.eth.accounts.wallet.add(TEST_PRIVATE_KEY)

const arbiterFee = 0
const nonce = 2

async function getGasPrice() {
  try {
    const gasPrices = await axios.get(
      'https://ethgasstation.info/json/ethgasAPI.json'
    )
    return web3.utils.toWei((gasPrices.data.fastest / 10).toString(), 'gwei')
  } catch (err) {
    console.error(
      `Got ${err} when trying to fetch gas from ethgasstation.info, falling back web3's gas estimation`
    )
    return (await web3.eth.getGasPrice()).toString()
  }
}

const getSignedVAAWithRetry = async function (
  hosts,
  emitterChain,
  emitterAddress,
  sequence,
  extraGrpcOpts = {},
  retryTimeout = RETRY_DELAY_MS_VAA,
  retryAttempts = NUM_RETRIES_VAA
) {
  let currentWormholeRpcHost = -1
  const getNextRpcHost = () => ++currentWormholeRpcHost % hosts.length
  let result
  let attempts = 0
  while (!result) {
    attempts++
    console.log(
      `transferCommunityRewardsToSolana.js | getSignedVAAWithRetry | attempt # ${attempts}`
    )
    await new Promise((resolve) => setTimeout(resolve, retryTimeout))
    try {
      result = await getSignedVAA(
        hosts[getNextRpcHost()],
        emitterChain,
        emitterAddress,
        sequence,
        extraGrpcOpts
      )
    } catch (e) {
      if (retryAttempts !== undefined && attempts >= retryAttempts) {
        throw e
      }
    }
  }
  return result
}

const getReceipt = async (txHash, numRetries) => {
  console.log(
    `transferCommunityRewardsToSolana.js | getReceipt | txHash ${txHash} | ${numRetries} retries left`
  )
  if (numRetries <= 0) {
    return null
  }
  const txReceipt = await web3.eth.getTransactionReceipt(txHash)
  if (!txReceipt) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS_RECEIPT))
    return getReceipt(numRetries - 1)
  }
  return txReceipt
}

async function run() {
  try {
    const gasPrice = await getGasPrice()
    console.log({ gasPrice })

    const ethRewardsManagerContract = new web3.eth.Contract(
      EthRewardManagerABI,
      ETH_REWARD_MANAGER_ADDRESS
    )
    const txResp = await ethRewardsManagerContract.methods
      .transferToSolana(arbiterFee, nonce)
      .send({
        from: ethAccount.address,
        gas: 200000, // should this be dynamic?
        gasPrice
      })
    console.log({ txResp })

    const txHash = txResp.transactionHash
    console.log({ txHash })

    const txReceipt = await getReceipt(txHash, NUM_RETRIES_RECEIPT)
    console.log({ txReceipt })
    if (!txReceipt) {
      return
    }

    const sequence = parseSequenceFromLogEth(txReceipt, ETH_BRIDGE_ADDRESS)
    const emitterAddress = getEmitterAddressEth(ETH_TOKEN_BRIDGE_ADDRESS)
    console.log({ sequence, emitterAddress })

    const { vaaBytes } = await getSignedVAAWithRetry(
      WORMHOLE_RPC_HOSTS,
      CHAIN_ID_ETH,
      emitterAddress,
      sequence
    )
    console.log({ vaaBytes })

    const signTransaction = async (transaction) => {
      transaction.partialSign(feePayerKeypair)
      return transaction
    }
    await postVaaSolana(
      connection,
      signTransaction,
      SOL_BRIDGE_ADDRESS,
      feePayerAddress,
      vaaBytes
    )
    const transaction = await redeemOnSolana(
      connection,
      SOL_BRIDGE_ADDRESS,
      SOL_TOKEN_BRIDGE_ADDRESS,
      feePayerAddress,
      vaaBytes
    )
    console.log({ transaction })

    const signed = await signTransaction(transaction)
    console.log({ signed })

    const txid = await connection.sendRawTransaction(signed.serialize())
    console.log({ txid })

    await connection.confirmTransaction(txid)
    console.log('Success!')
  } catch (e) {
    console.error(e)
    console.log(`Error: ${e.message}`)
  }
}
if (require && require.main === module) {
  run()
}

module.exports = {
  transferCommunityRewardsToSolana: run
}
