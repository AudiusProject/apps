const config = require('../config.js')
const models = require('../models')
const {
  handleResponse,
  successResponse,
  errorResponseServerError
} = require('../apiHelpers')
const { sequelize } = require('../models')
const { getRelayerFunds, fundRelayerIfEmpty } = require('../relay/txRelay')
const { getEthRelayerFunds } = require('../relay/ethTxRelay')
const solanaWeb3 = require('@solana/web3.js')
const Web3 = require('web3')
const audiusLibsWrapper = require('../audiusLibsInstance')
const {
  NOTIFICATION_JOB_LAST_SUCCESS_KEY,
  NOTIFICATION_EMAILS_JOB_LAST_SUCCESS_KEY,
  NOTIFICATION_ANNOUNCEMENTS_JOB_LAST_SUCCESS_KEY
} = require('../notifications/index.js')

const axios = require('axios')
const moment = require('moment')

// Defaults used in relay health check endpoint
const RELAY_HEALTH_ACCOUNTS = new Set(
  config.get('relayerWallets').map((wallet) => wallet.publicKey)
)
const ETH_RELAY_HEALTH_ACCOUNTS = new Set(
  config.get('ethRelayerWallets').map((wallet) => wallet.publicKey)
)

module.exports = function (app) {
  /**
   * Relay health check endpoint. Takes the query params startBlock, endBlock, maxTransactions, and maxErrors.
   * If those query params are not specified, use default values.
   */
  /*
  There are a few scenarios where a health check should return unhealthy
  1. Some number of relays are failing for some number of users
     To solve this, traverse the blocks for Audius transactions and count failures
     for users. If it's greater than some threshold, return error
  2. Relays are not being sent / sent but not acknowledged by blockchain
  */
  app.get(
    '/health_check/relay',
    handleResponse(async (req, res) => {
      const start = Date.now()
      const redis = req.app.get('redis')

      const maxErrors = parseInt(req.query.maxErrors)
      const minTransactions = parseInt(req.query.minTransactions)
      const isVerbose = req.query.verbose || false
      const maxRelayLatency = parseInt(req.query.maxRelayLatency)
      let isError = false

      // delete old entries from set in redis
      const epochTenMinutesAgo = Math.floor(Date.now() / 1000) - 600
      await redis.zremrangebyscore(
        'relayTxAttempts',
        '-inf',
        epochTenMinutesAgo
      )
      await redis.zremrangebyscore(
        'relayTxFailures',
        '-inf',
        epochTenMinutesAgo
      )
      await redis.zremrangebyscore(
        'relayTxSuccesses',
        '-inf',
        epochTenMinutesAgo
      )

      // check if there have been any attempts in the time window that we processed the block health check
      const attemptedTxsInRedis = await redis.zrange(
        'relayTxAttempts',
        '0',
        '-1'
      )
      const successfulTxsInRedis = await redis.zrange(
        'relayTxSuccesses',
        '0',
        '-1'
      )
      const failureTxsInRedis = await redis.zrange('relayTxFailures', '0', '-1')

      if (minTransactions && successfulTxsInRedis.length < minTransactions) {
        isError = true
      }

      if (maxErrors && failureTxsInRedis.length > maxErrors) {
        isError = true
      }

      for (const tx of successfulTxsInRedis) {
        const parsedTx = JSON.parse(tx)
        if (
          maxRelayLatency &&
          parsedTx.totalTransactionLatency / 1000 > maxRelayLatency
        ) {
          isError = true
          break
        }
      }

      const serverResponse = {
        redis: {
          attemptedTxsCount: attemptedTxsInRedis.length,
          successfulTxsCount: successfulTxsInRedis.length,
          failureTxsCount: failureTxsInRedis.length
        },
        healthCheckComputeTime: Date.now() - start
      }

      if (isVerbose) {
        serverResponse.redis = {
          ...serverResponse.redis,
          attemptedTxsInRedis,
          successfulTxsInRedis,
          failureTxsInRedis
        }
      }

      if (isError) return errorResponseServerError(serverResponse)
      else return successResponse(serverResponse)
    })
  )

  app.get(
    '/health_check',
    handleResponse(async (req, res) => {
      // for now we just check db connectivity
      await sequelize.query('SELECT 1', { type: sequelize.QueryTypes.SELECT })

      // get connected discprov via libs
      const audiusLibsInstance = req.app.get('audiusLibs')
      return successResponse({
        healthy: true,
        git: process.env.GIT_SHA,
        selectedDiscoveryProvider:
          audiusLibsInstance.discoveryProvider.discoveryProviderEndpoint
      })
    })
  )

  app.get(
    '/health_check/poa',
    handleResponse(async (req, res) => {
      return successResponse({
        finalPOABlock: config.get('finalPOABlock')
      })
    })
  )

  app.get(
    '/balance_check',
    handleResponse(async (req, res) => {
      let { minimumBalance, minimumRelayerBalance } = req.query
      minimumBalance = parseFloat(
        minimumBalance || config.get('minimumBalance')
      )
      minimumRelayerBalance = parseFloat(
        minimumRelayerBalance || config.get('minimumRelayerBalance')
      )
      const belowMinimumBalances = []
      let balances = []

      // run fundRelayerIfEmpty so it'll auto top off any accounts below the threshold
      try {
        await fundRelayerIfEmpty()
      } catch (err) {
        req.logger.error(`Failed to fund relayer with error: ${err}`)
      }

      balances = await Promise.all(
        [...RELAY_HEALTH_ACCOUNTS].map(async (account) => {
          const balance = parseFloat(
            Web3.utils.fromWei(await getRelayerFunds(account), 'ether')
          )
          if (balance < minimumBalance) {
            belowMinimumBalances.push({ account, balance })
          }
          return { account, balance }
        })
      )

      const relayerPublicKey = config.get('relayerPublicKey')
      const relayerBalance = parseFloat(
        Web3.utils.fromWei(await getRelayerFunds(relayerPublicKey), 'ether')
      )
      const relayerAboveMinimum = relayerBalance >= minimumRelayerBalance

      // no accounts below minimum balance
      if (!belowMinimumBalances.length && relayerAboveMinimum) {
        return successResponse({
          above_balance_minimum: true,
          minimum_balance: minimumBalance,
          balances,
          relayer: {
            wallet: relayerPublicKey,
            balance: relayerBalance,
            above_balance_minimum: relayerAboveMinimum
          }
        })
      } else {
        return errorResponseServerError({
          above_balance_minimum: false,
          minimum_balance: minimumBalance,
          balances,
          below_minimum_balance: belowMinimumBalances,
          relayer: {
            wallet: relayerPublicKey,
            balance: relayerBalance,
            above_balance_minimum: relayerAboveMinimum
          }
        })
      }
    })
  )

  app.get(
    '/eth_balance_check',
    handleResponse(async (req, res) => {
      let { minimumBalance, minimumFunderBalance } = req.query
      minimumBalance = parseFloat(
        minimumBalance || config.get('ethMinimumBalance')
      )
      minimumFunderBalance = parseFloat(
        minimumFunderBalance || config.get('ethMinimumFunderBalance')
      )
      const funderAddress = config.get('ethFunderAddress')
      const funderBalance = parseFloat(
        Web3.utils.fromWei(await getEthRelayerFunds(funderAddress), 'ether')
      )
      const funderAboveMinimum = funderBalance >= minimumFunderBalance
      const belowMinimumBalances = []

      const balances = await Promise.all(
        [...ETH_RELAY_HEALTH_ACCOUNTS].map(async (account) => {
          const balance = parseFloat(
            Web3.utils.fromWei(await getEthRelayerFunds(account), 'ether')
          )
          if (balance < minimumBalance) {
            belowMinimumBalances.push({ account, balance })
          }
          return { account, balance }
        })
      )

      const balanceResponse = {
        minimum_balance: minimumBalance,
        balances,
        funder: {
          wallet: funderAddress,
          balance: funderBalance,
          above_balance_minimum: funderAboveMinimum
        }
      }

      // no accounts below minimum balance
      if (!belowMinimumBalances.length && funderAboveMinimum) {
        return successResponse({
          above_balance_minimum: true,
          ...balanceResponse
        })
      } else {
        return errorResponseServerError({
          above_balance_minimum: false,
          below_minimum_balance: belowMinimumBalances,
          ...balanceResponse
        })
      }
    })
  )

  app.get(
    '/sol_balance_check',
    handleResponse(async (req, res) => {
      const minimumBalance = parseFloat(
        req.query.minimumBalance || config.get('solMinimumBalance')
      )
      const solanaFeePayerWallets = config.get('solanaFeePayerWallets')
      const libs = req.app.get('audiusLibs')
      const connection = libs.solanaWeb3Manager.getConnection()

      const solanaFeePayerBalances = {}
      const belowMinimumBalances = []

      if (solanaFeePayerWallets) {
        await Promise.all(
          [...solanaFeePayerWallets].map(async (wallet) => {
            const feePayerPubKey = solanaWeb3.Keypair.fromSecretKey(
              Uint8Array.from(wallet.privateKey)
            ).publicKey
            const feePayerBase58 = feePayerPubKey.toBase58()
            const balance = await connection.getBalance(feePayerPubKey)
            if (balance < minimumBalance) {
              belowMinimumBalances.push({ wallet: feePayerBase58, balance })
            }
            solanaFeePayerBalances[feePayerBase58] = balance
            return { wallet: feePayerBase58, balance }
          })
        )
      }

      const solanaFeePayerBalancesArr = Object.keys(solanaFeePayerBalances).map(
        (key) => [key, solanaFeePayerBalances[key]]
      )

      if (belowMinimumBalances.length === 0) {
        return successResponse({
          above_balance_minimum: true,
          minimum_balance: minimumBalance,
          balances: solanaFeePayerBalancesArr
        })
      }

      return errorResponseServerError({
        above_balance_minimum: false,
        minimum_balance: minimumBalance,
        belowMinimumBalances,
        balances: solanaFeePayerBalancesArr
      })
    })
  )

  app.get(
    '/notification_check',
    handleResponse(async (req, res) => {
      let { maxBlockDifference, maxDrift } = req.query
      maxBlockDifference = maxBlockDifference || 100

      let highestBlockNumber =
        await models.NotificationAction.max('blocknumber')
      if (!highestBlockNumber) {
        highestBlockNumber = config.get('notificationStartBlock')
      }
      req.logger.info(
        `notifications_check | Running notifications_check, comparing blockNumber ${highestBlockNumber}`
      )
      const redis = req.app.get('redis')
      const maxFromRedis = await redis.get('maxBlockNumber')
      if (maxFromRedis) {
        highestBlockNumber = parseInt(maxFromRedis)
      }

      // Get job success timestamps
      const notificationJobLastSuccess = await redis.get(
        NOTIFICATION_JOB_LAST_SUCCESS_KEY
      )
      const notificationEmailsJobLastSuccess = await redis.get(
        NOTIFICATION_EMAILS_JOB_LAST_SUCCESS_KEY
      )
      const notificationAnnouncementsJobLastSuccess = await redis.get(
        NOTIFICATION_ANNOUNCEMENTS_JOB_LAST_SUCCESS_KEY
      )

      const { discoveryProvider } = audiusLibsWrapper.getAudiusLibs()
      req.logger.info(
        `notifications_check | Making notification_check request on ${discoveryProvider} at ${discoveryProvider.discoveryProviderEndpoint}`
      )

      const body = (
        await axios({
          method: 'get',
          url: `${discoveryProvider.discoveryProviderEndpoint}/health_check`
        })
      ).data
      req.logger.info(
        `notifications_check | Received notification_check response ${body} on ${discoveryProvider.discoveryProviderEndpoint}`
      )
      const discProvDbHighestBlock = body.data.db.number
      const notifBlockDiff = discProvDbHighestBlock - highestBlockNumber
      const resp = {
        discProv: body.data,
        identity: highestBlockNumber,
        notifBlockDiff,
        notificationJobLastSuccess,
        notificationEmailsJobLastSuccess,
        notificationAnnouncementsJobLastSuccess
      }

      // Test if last runs were recent enough
      let withinBounds = true
      if (maxDrift) {
        const cutoff = moment().subtract(maxDrift, 'seconds')
        const isWithinBounds = (key) =>
          key ? moment(key).isAfter(cutoff) : true
        withinBounds =
          isWithinBounds(notificationJobLastSuccess) &&
          isWithinBounds(notificationEmailsJobLastSuccess) &&
          isWithinBounds(notificationAnnouncementsJobLastSuccess)
        req.logger.info(
          `notifications_check | isWithinBounds is ${withinBounds} and notifBlockDiff is ${notifBlockDiff}`
        )
      }
      if (!withinBounds || notifBlockDiff > maxBlockDifference) {
        req.logger.info(
          `notifications_check | Returning a 500 because we are out of bounds or notifBlockDiff is too large`
        )
        return errorResponseServerError(resp)
      }

      return successResponse(resp)
    })
  )

  /**
   * Exposes current and max db connection stats.
   * Returns error if db connection threshold exceeded, else success.
   */
  app.get(
    '/db_check',
    handleResponse(async (req, res) => {
      const verbose = req.query.verbose === 'true'
      const maxConnections = config.get('pgConnectionPoolMax')

      let numConnections = 0
      let connectionInfo = null
      let activeConnections = null
      let idleConnections = null

      // Get number of open DB connections
      const numConnectionsQuery = await sequelize.query(
        "SELECT numbackends from pg_stat_database where datname = 'audius_centralized_service'"
      )
      if (
        numConnectionsQuery &&
        numConnectionsQuery[0] &&
        numConnectionsQuery[0][0] &&
        numConnectionsQuery[0][0].numbackends
      ) {
        numConnections = numConnectionsQuery[0][0].numbackends
      }

      // Get detailed connection info
      const connectionInfoQuery = await sequelize.query(
        "select wait_event_type, wait_event, state, query from pg_stat_activity where datname = 'audius_centralized_service'"
      )
      if (connectionInfoQuery && connectionInfoQuery[0]) {
        connectionInfo = connectionInfoQuery[0]
        activeConnections = connectionInfo.filter(
          (conn) => conn.state === 'active'
        ).length
        idleConnections = connectionInfo.filter(
          (conn) => conn.state === 'idle'
        ).length
      }

      const resp = {
        git: process.env.GIT_SHA,
        connectionStatus: {
          total: numConnections,
          active: activeConnections,
          idle: idleConnections
        },
        maxConnections
      }

      if (verbose) {
        resp.connectionInfo = connectionInfo
      }

      return numConnections >= maxConnections
        ? errorResponseServerError(resp)
        : successResponse(resp)
    })
  )
}
