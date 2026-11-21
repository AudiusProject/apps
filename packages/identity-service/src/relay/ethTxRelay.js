const EthereumWallet = require('ethereumjs-wallet')
const { Transaction } = require('ethereumjs-tx')
const config = require('../config')
const { ethWeb3 } = require('../web3')
const { logger } = require('../logging')
const { Lock } = require('../redis')

const ENVIRONMENT = config.get('environment')
const DEFAULT_GAS_LIMIT = config.get('defaultGasLimit')

const ethRelayerWallets = config.get('ethRelayerWallets')

const generateETHWalletLockKey = (publicKey) =>
  `ETH_RELAYER_WALLET:${publicKey}`

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const getEthRelayerWalletIndex = (walletAddress) => {
  const walletParsedInteger = parseInt(walletAddress, 16)
  return walletParsedInteger % ethRelayerWallets.length
}

const queryEthRelayerWallet = (walletAddress) => {
  return ethRelayerWallets[getEthRelayerWalletIndex(walletAddress)].publicKey
}

const getEthRelayerFunds = async (walletPublicKey) => {
  return ethWeb3.eth.getBalance(walletPublicKey)
}

const selectEthWallet = async (walletPublicKey, reqLogger) => {
  reqLogger.info(`L1 txRelay - Acquiring lock for ${walletPublicKey}`)
  const ethWalletIndex = getEthRelayerWalletIndex(walletPublicKey)
  const selectedRelayerWallet = ethRelayerWallets[ethWalletIndex]

  while (
    (await Lock.setLock(
      generateETHWalletLockKey(selectedRelayerWallet.publicKey)
    )) !== true
  ) {
    await delay(200)
  }
  reqLogger.info(
    `L1 txRelay - Locking ${selectedRelayerWallet.publicKey}, index=${ethWalletIndex}}`
  )
  return {
    selectedEthRelayerWallet: selectedRelayerWallet,
    ethWalletIndex
  }
}

const sendEthTransaction = async (req, txProps, reqBodySHA) => {
  const { contractAddress, encodedABI, senderAddress, gasLimit } = txProps

  const { selectedEthRelayerWallet, ethWalletIndex } = await selectEthWallet(
    senderAddress,
    logger
  )
  req.logger.info(
    `L1 txRelay - selected relayerPublicWallet=${selectedEthRelayerWallet.publicKey}`
  )

  let resp
  try {
    resp = await createAndSendEthTransaction(
      {
        publicKey: selectedEthRelayerWallet.publicKey,
        privateKey: selectedEthRelayerWallet.privateKey
      },
      contractAddress,
      '0x00',
      ethWeb3,
      req.logger,
      gasLimit,
      encodedABI
    )
  } catch (e) {
    req.logger.error('L1 txRelay - Error in relay', e)
    throw e
  } finally {
    req.logger.info(
      `L1 txRelay - Unlocking ${ethRelayerWallets[ethWalletIndex].publicKey}, index=${ethWalletIndex}}`
    )
    await Lock.clearLock(
      generateETHWalletLockKey(ethRelayerWallets[ethWalletIndex].publicKey)
    )
  }

  req.logger.info(
    `L1 txRelay - success, req:${reqBodySHA}, sender:${senderAddress}`
  )
  return resp
}

const estimateEthTransactionGas = async (senderAddress, to, data) => {
  const ethWalletIndex = getEthRelayerWalletIndex(senderAddress)
  const selectedRelayerWallet = ethRelayerWallets[ethWalletIndex]
  const toChecksumAddress = ethWeb3.utils.toChecksumAddress
  const estimatedGas = await ethWeb3.eth.estimateGas({
    from: toChecksumAddress(selectedRelayerWallet.publicKey),
    to: toChecksumAddress(to),
    data
  })
  return estimatedGas
}

const createAndSendEthTransaction = async (
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
    throw new Error(
      `L1 txRelay - Invalid relayerPublicKey found. Expected ${sender.publicKey.toLowerCase()}, found ${address}`
    )
  }
  const gasPrice = await web3.eth.getGasPrice()
  const nonce = await web3.eth.getTransactionCount(address)
  let txParams = {
    nonce: web3.utils.toHex(nonce),
    gasLimit: gasLimit ? web3.utils.numberToHex(gasLimit) : DEFAULT_GAS_LIMIT,
    gasPrice: web3.utils.numberToHex(gasPrice),
    to: receiverAddress,
    value: web3.utils.toHex(value)
  }
  logger.info(`L1 txRelay - Final params: ${JSON.stringify(txParams)}`)
  if (data) {
    txParams = { ...txParams, data }
  }
  const tx = new Transaction(txParams)
  tx.sign(privateKeyBuffer)
  const signedTx = '0x' + tx.serialize().toString('hex')
  logger.info(
    `L1 txRelay - sending a transaction for sender ${sender.publicKey} to ${receiverAddress}, gasLimit ${txParams.gasLimit}, nonce ${nonce}`
  )
  const receipt = await web3.eth.sendSignedTransaction(signedTx)

  return { txHash: receipt.transactionHash, txParams }
}

const fundEthRelayerIfEmpty = async () => {
  const minimumBalance = ethWeb3.utils.toWei(
    config.get('ethMinimumBalance').toString(),
    'ether'
  )
  for (const ethWallet of ethRelayerWallets) {
    const ethWalletPublicKey = ethWallet.publicKey
    const balance = await ethWeb3.eth.getBalance(ethWalletPublicKey)
    logger.info(
      `L1 txRelay - balance for ethWalletPublicKey ${ethWalletPublicKey}: ${balance}, minimumBalance: ${minimumBalance}`
    )
    const validBalance = parseInt(balance) >= minimumBalance
    if (ENVIRONMENT === 'development') {
      if (!validBalance) {
        const account = (await ethWeb3.eth.getAccounts())[0]
        logger.info(
          `L1 txRelay - transferring funds [${minimumBalance}] from ${account} to wallet ${ethWalletPublicKey}`
        )
        await ethWeb3.eth.sendTransaction({
          from: account,
          to: ethWalletPublicKey,
          value: minimumBalance
        })
        logger.info(
          `L1 txRelay - transferred funds [${minimumBalance}] from ${account} to wallet ${ethWalletPublicKey}`
        )
      } else {
        logger.info(
          `L1 txRelay - ${ethWalletPublicKey} has valid balance ${balance}, minimum:${minimumBalance}`
        )
      }
    } else {
      logger.info(`L1 txRelay -  ${ethWalletPublicKey} below minimum balance`)
      throw new Error(
        `Invalid balance for ethRelayer account ${ethWalletPublicKey}. Found ${balance}, required minimumBalance ${minimumBalance}`
      )
    }
  }
}

module.exports = {
  estimateEthTransactionGas,
  fundEthRelayerIfEmpty,
  sendEthTransaction,
  queryEthRelayerWallet,
  getEthRelayerFunds,
  generateETHWalletLockKey
}
