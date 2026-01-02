const EthereumWallet = require('ethereumjs-wallet')
const { Transaction } = require('ethereumjs-tx')
const Accounts = require('web3-eth-accounts')

const models = require('../models')
const config = require('../config')
const { logger } = require('../logging')
const { Lock } = require('../redis')
const RelayReporter = require('../utils/relayReporter')

const { libs } = require('@audius/sdk-legacy/dist/libs')
const AudiusABIDecoder = libs.AudiusABIDecoder
const { primaryWeb3, nethermindWeb3, secondaryWeb3 } = require('../web3')

// L2 relayerWallets
const relayerWallets = config.get('relayerWallets') // { publicKey, privateKey }

const ENVIRONMENT = config.get('environment')
const MIN_GAS_PRICE = config.get('minGasPrice')
const HIGH_GAS_PRICE = config.get('highGasPrice')
const GANACHE_GAS_PRICE = config.get('ganacheGasPrice')
const DEFAULT_GAS_LIMIT = config.get('defaultGasLimit')
const UPDATE_REPLICA_SET_RECONFIGURATION_LIMIT = config.get(
  'updateReplicaSetReconfigurationLimit'
)
const UPDATE_REPLICA_SET_WALLET_WHITELIST = config.get(
  'updateReplicaSetWalletWhitelist'
)

const transactionRateLimiter = {
  updateReplicaSetReconfiguration: 0
}

setInterval(() => {
  transactionRateLimiter.updateReplicaSetReconfiguration = 0
}, 10000)

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const generateWalletLockKey = (publicKey) => `POA_RELAYER_WALLET:${publicKey}`

async function getGasPrice(logger, web3) {
  let gasPrice = parseInt(await web3.eth.getGasPrice())
  if (isNaN(gasPrice) || gasPrice > HIGH_GAS_PRICE) {
    logger.info(
      'txRelay - gas price was not defined or was greater than HIGH_GAS_PRICE',
      gasPrice
    )
    gasPrice = GANACHE_GAS_PRICE
  } else if (gasPrice === 0) {
    logger.info('txRelay - gas price was zero', gasPrice)
    // If the gas is zero, the txn will likely never get mined.
    gasPrice = MIN_GAS_PRICE
  } else if (gasPrice < MIN_GAS_PRICE) {
    logger.info('txRelay - gas price was less than MIN_GAS_PRICE', gasPrice)
    gasPrice = MIN_GAS_PRICE
  }
  gasPrice = '0x' + gasPrice.toString(16)

  return gasPrice
}

/** Attempt to send transaction to primary web3 provider, if that fails try secondary */
const sendTransaction = async (
  req,
  resetNonce = false,
  txProps,
  reqBodySHA
) => {
  let resp = null
  try {
    resp = await sendTransactionInternal(req, primaryWeb3, txProps, reqBodySHA)
  } catch (e) {
    req.logger.error(
      `txRelay - sendTransaction Error - ${e}. Retrying with secondary web3.`
    )
    resp = await sendTransactionInternal(
      req,
      secondaryWeb3,
      txProps,
      reqBodySHA
    )
  }
  return resp
}

const sendTransactionInternal = async (req, web3, txProps, reqBodySHA) => {
  let {
    contractRegistryKey,
    contractAddress,
    nethermindContractAddress,
    encodedABI,
    nethermindEncodedABI,
    senderAddress,
    gasLimit
  } = txProps
  const redis = req.app.get('redis')
  const startTransactionLatency = new Date().getTime()
  const reporter = new RelayReporter({
    // report analytics everywhere except local
    shouldReportAnalytics: config.get('environment') !== 'development'
  })

  const user = await models.User.findOne({
    where: { walletAddress: req.body.senderAddress },
    attributes: ['blockchainUserId']
  })
  const userId =
    user && user.blockchainUserId ? user.blockchainUserId : 'unknown'

  reporter.reportStart({
    userId,
    contractAddress,
    nethermindContractAddress,
    senderAddress
  })

  // SEND to both nethermind and POA
  // sendToNethermindOnly indicates relay should respond with that receipt
  const currentBlock = await web3.eth.getBlockNumber()
  const finalPOABlock = config.get('finalPOABlock')
  let sendToNethermindOnly = finalPOABlock
    ? currentBlock > finalPOABlock
    : false

  // prod will surpass finalPOABlock
  if (!config.get('nethermindEnabled')) {
    // nulling this will disable nethermind relays
    nethermindContractAddress = null
  }
  if (config.get('environment') === 'production') {
    sendToNethermindOnly = true
  }

  const contractName =
    contractRegistryKey.charAt(0).toUpperCase() + contractRegistryKey.slice(1) // uppercase the first letter
  const decodedABI = AudiusABIDecoder.decodeMethod(contractName, encodedABI)

  const nonce = decodedABI.params.find((param) => param.name === '_nonce').value
  const sig = decodedABI.params.find(
    (param) => param.name === '_subjectSig'
  ).value
  const hashedData = web3.utils.keccak256(nonce + sig)

  const existingTx = await models.Transaction.findOne({
    where: {
      encodedNonceAndSignature: hashedData // this should always be unique
    }
  })

  // if this transaction has already been submitted before and succeeded, send this receipt
  if (existingTx) {
    return existingTx.receipt
  }

  filterReplicaSetUpdates(decodedABI, senderAddress)

  // will be set later. necessary for code outside scope of try block
  let txReceipt
  let txParams
  let redisLogParams
  let wallet = await selectWallet()

  // If all wallets are currently in use, keep iterating until a wallet is freed up
  while (!wallet) {
    await delay(200)
    wallet = await selectWallet()
  }

  await redis.zadd(
    'relayTxAttempts',
    Math.floor(Date.now() / 1000),
    JSON.stringify({
      date: Math.floor(Date.now() / 1000),
      reqBodySHA,
      senderAddress
    })
  )

  req.logger.info(
    `L2 - txRelay - selected wallet ${wallet.publicKey} for sender ${senderAddress}`
  )

  // relay stats object that gets filled out as relay occurs
  const relayStats = {
    poa: {
      isRecipient: false,
      txSubmissionTime: null
    },
    nethermind: {
      isRecipient: false,
      txSubmissionTime: null
    }
  }

  try {
    req.logger.info(
      `L2 - txRelay - selected wallet ${wallet.publicKey} for sender ${senderAddress}`
    )

    // send to POA
    // PROD doesn't have sendToNethermindOnly and should default to POA
    // STAGE defaults to nethermind but can send to POA when it has both addresses
    const relayPromises = []

    if (!sendToNethermindOnly) {
      relayStats.poa.isRecipient = true
      relayPromises.push(
        createAndSendTransaction(
          wallet,
          contractAddress,
          '0x00',
          web3,
          req.logger,
          gasLimit,
          encodedABI
        )
      )
    }

    // send to nethermind
    // PROD doesn't have sendToNethermindOnly and only sends to nethermind when it has both addresses
    // STAGE defaults to nethermind
    if (sendToNethermindOnly) {
      if (!nethermindContractAddress) {
        nethermindContractAddress = contractAddress
        nethermindEncodedABI = encodedABI
      }
      relayStats.nethermind.isRecipient = true
      relayPromises.push(
        relayToNethermindWithTimeout(
          nethermindEncodedABI,
          nethermindContractAddress,
          gasLimit
        )
      )
    }
    const relayTxs = await Promise.allSettled(relayPromises)

    const end = new Date().getTime()
    const totalTransactionLatency = end - startTransactionLatency

    logger.info(`L2 - txRelay - relays settled ${JSON.stringify(relayTxs)}`)

    if (relayTxs.length === 1) {
      txParams = relayTxs[0].value.txParams
      txReceipt = relayTxs[0].value.receipt
      // infer tx type and populate time
      if (relayStats.nethermind.isRecipient) {
        relayStats.nethermind.txSubmissionTime =
          relayTxs[0].value.timeToComplete
        reporter.reportSuccess({
          chain: 'acdc',
          userId,
          contractAddress,
          nethermindContractAddress,
          senderAddress,
          totalTime: totalTransactionLatency,
          txSubmissionTime: relayStats.nethermind.txSubmissionTime
        })
      } else {
        relayStats.poa.txSubmissionTime = relayTxs[0].value.timeToComplete
        reporter.reportSuccess({
          chain: 'poa',
          userId,
          contractAddress,
          nethermindContractAddress,
          senderAddress,
          totalTime: totalTransactionLatency,
          txSubmissionTime: relayStats.poa.txSubmissionTime
        })
      }
    } else if (relayTxs.length === 2) {
      const [poaTx, nethermindTx] = relayTxs.map((result) => result?.value)
      logger.info(
        `txRelay - poaTx: ${JSON.stringify(
          poaTx?.txParams
        )} | nethermindTx: ${JSON.stringify(nethermindTx?.txParams)}`
      )
      if (sendToNethermindOnly) {
        txParams = nethermindTx.txParams
        txReceipt = nethermindTx.receipt
      } else {
        txParams = poaTx.txParams
        txReceipt = poaTx.receipt
      }
      // populate both, we want stats if relay went to both chains
      relayStats.nethermind.txSubmissionTime = nethermindTx.timeToComplete
      relayStats.poa.txSubmissionTime = poaTx.timeToComplete
      reporter.reportSuccess({
        chain: 'poa',
        userId,
        contractAddress,
        nethermindContractAddress,
        senderAddress,
        totalTime: totalTransactionLatency,
        txSubmissionTime: relayStats.poa.txSubmissionTime
      })
      reporter.reportSuccess({
        chain: 'acdc',
        userId,
        contractAddress,
        nethermindContractAddress,
        senderAddress,
        totalTime: totalTransactionLatency,
        txSubmissionTime: relayStats.nethermind.txSubmissionTime
      })
    }

    redisLogParams = {
      date: Math.floor(Date.now() / 1000),
      reqBodySHA,
      txParams,
      senderAddress,
      nonce: txParams.nonce,
      relayStats,
      totalTransactionLatency
    }
    req.logger.info(
      `L2 - txRelay - sending a transaction for wallet ${
        wallet.publicKey
      } to ${senderAddress}, req ${reqBodySHA}, gasPrice ${parseInt(
        txParams.gasPrice,
        16
      )}, gasLimit ${gasLimit}, nonce ${txParams.nonce}`
    )

    await redis.zadd(
      'relayTxSuccesses',
      Math.floor(Date.now() / 1000),
      JSON.stringify(redisLogParams)
    )
    await redis.hset(
      'txHashToSenderAddress',
      txReceipt.transactionHash,
      senderAddress
    )
  } catch (e) {
    req.logger.error('L2 - txRelay - Error in relay', e)
    await redis.zadd(
      'relayTxFailures',
      Math.floor(Date.now() / 1000),
      JSON.stringify(redisLogParams)
    )
    const end = new Date().getTime()
    const totalTransactionLatency = end - startTransactionLatency
    reporter.reportError({
      chain: 'poa',
      userId,
      contractAddress,
      nethermindContractAddress,
      senderAddress,
      totalTime: totalTransactionLatency,
      txSubmissionTime: relayStats.poa.txSubmissionTime,
      errMsg: e.toString()
    })
    reporter.reportError({
      chain: 'acdc',
      userId,
      contractAddress,
      nethermindContractAddress,
      senderAddress,
      totalTime: totalTransactionLatency,
      txSubmissionTime: relayStats.nethermind.txSubmissionTime,
      errMsg: e.toString()
    })
    throw e
  } finally {
    await Lock.clearLock(generateWalletLockKey(wallet.publicKey))
  }

  req.logger.info(`L2 - txRelay - success, req ${reqBodySHA}`)

  await models.Transaction.create({
    contractRegistryKey,
    contractFn: decodedABI.name,
    contractAddress,
    senderAddress,
    encodedNonceAndSignature: hashedData,
    decodedABI,
    receipt: txReceipt
  })

  return txReceipt
}

/**
 * Rate limit replica set reconfiguration transactions
 * the available wallets using mod
 *
 * A reconfiguration (as opposed to a first time selection) will have an
 * _oldPrimaryId value of "0"
 */

const filterReplicaSetUpdates = (decodedABI, senderAddress) => {
  let isReplicaSetTransaction = false
  let isFirstReplicaSetConfig = false

  if (decodedABI.name === 'updateReplicaSet') {
    // TODO remove legacy replica set updates
    isFirstReplicaSetConfig = decodedABI.params.find(
      (param) => param.name === '_oldPrimaryId' && param.value === '0'
    )
  } else if (decodedABI.name === 'manageEntity') {
    isReplicaSetTransaction = decodedABI.params.find(
      (param) =>
        param.name === '_entityType' && param.value === 'UserReplicaSet'
    )
    // isFirstReplicaSetConfig must be false
    // EntityManager create user actions include the initial replica set
  }

  if (isReplicaSetTransaction && !isFirstReplicaSetConfig) {
    transactionRateLimiter.updateReplicaSetReconfiguration += 1
    if (
      transactionRateLimiter.updateReplicaSetReconfiguration >
      UPDATE_REPLICA_SET_RECONFIGURATION_LIMIT
    ) {
      throw new Error('updateReplicaSet rate limit reached')
    }

    if (
      UPDATE_REPLICA_SET_WALLET_WHITELIST.length > 0 &&
      !UPDATE_REPLICA_SET_WALLET_WHITELIST.includes(senderAddress)
    ) {
      throw new Error(
        `Sender ${senderAddress} not allowed to make updateReplicaSet calls`
      )
    }
  }
}

/**
 * Randomly select a wallet with a random offset. Circularly iterate through all
 * the available wallets using mod
 *
 * e.g. If there are 5 wallets available and the offset is at 2, iterate
 * in the order 2, 3, 4, 0, 1, and use const count to iterate through
 * all the available number of wallets
 */
const selectWallet = async () => {
  let i = Math.floor(Math.random() * relayerWallets.length) // random offset
  let count = 0 // num wallets to iterate through

  while (count++ < relayerWallets.length) {
    const wallet = relayerWallets[i++ % relayerWallets.length]
    try {
      const locked = await Lock.setLock(generateWalletLockKey(wallet.publicKey))
      if (locked) return wallet
    } catch (e) {
      logger.error('Error selecting POA wallet for txRelay, reselecting', e)
    }
  }
}

/**
 * Fund L2 wallets as necessary to facilitate multiple relayers
 */
const fundRelayerIfEmpty = async () => {
  const minimumBalance = primaryWeb3.utils.toWei(
    config.get('minimumBalance').toString(),
    'ether'
  )

  for (const wallet of relayerWallets) {
    let balance = await primaryWeb3.eth.getBalance(wallet.publicKey)
    logger.info(
      'L2 - Attempting to fund wallet',
      wallet.publicKey,
      parseInt(balance)
    )

    if (parseInt(balance) < minimumBalance) {
      logger.info(
        `L2 - Relay account below minimum expected. Attempting to fund ${wallet.publicKey}`
      )
      if (ENVIRONMENT === 'development') {
        const account = (await primaryWeb3.eth.getAccounts())[0] // local acc is unlocked and does not need private key
        logger.info(
          `L2 - transferring funds [${minimumBalance}] from ${account} to wallet ${wallet.publicKey}`
        )
        await primaryWeb3.eth.sendTransaction({
          from: account,
          to: wallet.publicKey,
          value: minimumBalance
        })
      } else {
        logger.info(`relayerPublicKey: ${config.get('relayerPublicKey')}`)
        logger.info(
          `L2 - transferring funds [${minimumBalance}] from ${config.get(
            'relayerPublicKey'
          )} to wallet ${wallet.publicKey}`
        )
        const { receipt } = await createAndSendTransaction(
          {
            publicKey: config.get('relayerPublicKey'),
            privateKey: config.get('relayerPrivateKey')
          },
          wallet.publicKey,
          minimumBalance,
          primaryWeb3,
          logger
        )
        logger.info(`L2 - the transaction receipt ${JSON.stringify(receipt)}`)
      }

      balance = await getRelayerFunds(wallet.publicKey)
      logger.info(
        'L2 - Balance of relay account:',
        wallet.publicKey,
        primaryWeb3.utils.fromWei(balance.toString(), 'ether'),
        'eth'
      )
    }
  }
}

// Send transaction using provided web3 object
const createAndSendTransaction = async (
  sender,
  receiverAddress,
  value,
  web3,
  logger,
  gasLimit = null,
  data = null
) => {
  const privateKeyBuffer = Buffer.from(sender.privateKey, 'hex')
  const walletAddress = EthereumWallet.fromPrivateKey(privateKeyBuffer)
  const address = walletAddress.getAddressString()
  if (address !== sender.publicKey.toLowerCase()) {
    throw new Error('Invalid relayerPublicKey')
  }
  const start = new Date().getTime()
  const gasPrice = await getGasPrice(logger, web3)
  const nonce = await web3.eth.getTransactionCount(address)
  gasLimit = gasLimit ? web3.utils.numberToHex(gasLimit) : DEFAULT_GAS_LIMIT
  let txParams = {
    nonce: web3.utils.toHex(nonce),
    gasPrice,
    gasLimit,
    to: receiverAddress,
    value: web3.utils.toHex(value)
  }
  logger.info(`Final params: ${JSON.stringify(txParams)}`)

  if (data) {
    txParams = { ...txParams, data }
  }

  const tx = new Transaction(txParams)
  tx.sign(privateKeyBuffer)
  const signedTx = '0x' + tx.serialize().toString('hex')
  logger.info(
    `txRelay - sending a transaction for sender ${
      sender.publicKey
    } to ${receiverAddress}, gasPrice ${parseInt(
      gasPrice,
      16
    )}, gasLimit ${DEFAULT_GAS_LIMIT}, nonce ${nonce}`
  )
  const end = new Date().getTime()
  const took = end - start
  logger.info(
    `createAndSendTransaction ok txhash: ${signedTx.transactionHash} took: ${took}`
  )
  const receipt = await web3.eth.sendSignedTransaction(signedTx)
  return { receipt, txParams, timeToComplete: took }
}

//
// Relay txn to nethermind
//
async function relayToNethermindWithTimeout(
  encodedABI,
  contractAddress,
  gasLimit
) {
  return Promise.race([
    relayToNethermind(encodedABI, contractAddress, gasLimit),
    new Promise((resolve, reject) =>
      setTimeout(() => {
        const timeoutMessage = `txRelay - relayToNethermind timed out`
        reject(new Error(timeoutMessage))
      }, 10000)
    )
  ])
}

let inFlight = 0

async function relayToNethermind(encodedABI, contractAddress, gasLimit) {
  logger.info(
    `txRelay - relayToNethermind input params: ${encodedABI} ${contractAddress} ${gasLimit}`
  )

  // generate a new private key per transaction (gas is free)
  const accounts = new Accounts(config.get('nethermindWeb3Provider'))

  const wallet = accounts.create()
  const privateKey = wallet.privateKey.substring(2)
  const start = new Date().getTime()

  try {
    const toChecksumAddress = nethermindWeb3.utils.toChecksumAddress

    const nethermindGasLimit = await nethermindWeb3.eth.estimateGas({
      from: toChecksumAddress(wallet.address),
      to: toChecksumAddress(contractAddress),
      data: encodedABI
    })

    const transaction = {
      to: contractAddress,
      value: 0,
      gas: nethermindGasLimit,
      gasPrice: 0,
      data: encodedABI
    }

    const signedTx = await nethermindWeb3.eth.accounts.signTransaction(
      transaction,
      privateKey
    )

    inFlight++
    const myDepth = inFlight

    logger.info(
      `relayToNethermind sending txhash: ${signedTx.transactionHash} num: ${myDepth}`
    )

    const receipt = await nethermindWeb3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    )

    logger.info(
      `txRelay - relayToNethermind receipt: ${JSON.stringify(receipt)}`
    )
    receipt.blockNumber += config.get('finalPOABlock')

    const end = new Date().getTime()
    const took = end - start
    inFlight--
    logger.info(
      `relayToNethermind ok txhash: ${signedTx.transactionHash} num: ${myDepth} took: ${took} pending: ${inFlight}`
    )
    return {
      txParams: transaction,
      receipt,
      timeToComplete: took
    }
  } catch (err) {
    logger.info('relayToNethermind error:', err.toString())
  }
}

const getRelayerFunds = async (walletPublicKey) => {
  return primaryWeb3.eth.getBalance(walletPublicKey)
}

module.exports = {
  selectWallet,
  sendTransaction,
  getRelayerFunds,
  fundRelayerIfEmpty,
  generateWalletLockKey
}
