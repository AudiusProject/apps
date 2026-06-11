const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const sgMail = require('@sendgrid/mail')
const sgClient = require('@sendgrid/client')
const { redisClient, Lock } = require('./redis')
const optimizelySDK = require('@optimizely/optimizely-sdk')
const cluster = require('cluster')
const config = require('./config.js')
const txRelay = require('./relay/txRelay')
const ethTxRelay = require('./relay/ethTxRelay')
const { runMigrations } = require('./migrationManager')
const audiusLibsWrapper = require('./audiusLibsInstance')

const { generateWalletLockKey } = require('./relay/txRelay.js')
const { generateETHWalletLockKey } = require('./relay/ethTxRelay.js')

const { sendResponse, errorResponseServerError } = require('./apiHelpers')
const { logger, loggingMiddleware } = require('./logging')
const {
  getRateLimiter,
  getRateLimiterMiddleware,
  getRelayBlocklistMiddleware,
  getRelayRateLimiterMiddleware,
  isIPWhitelisted
} = require('./rateLimiter.js')
const cors = require('./corsMiddleware')
const { startRegistrationQueue } = require('./solanaNodeRegistration')

class App {
  constructor(port) {
    this.port = port
    this.express = express()
    this.redisClient = redisClient
    this.configureSendGrid()

    this.optimizelyPromise = null
    this.optimizelyClientInstance = this.configureOptimizely()

    // Note: The order of the following functions is IMPORTANT, as it sets the functions
    // that process a request in the order applied
    this.expressSettings()
    this.setMiddleware()
    this.setRateLimiters()
    this.setRoutes()
    this.setErrorHandler()
  }

  async init() {
    let server
    logger.info('identity init')

    /**
     * From the cluster docs - https://nodejs.org/docs/latest-v14.x/api/cluster.html#cluster_cluster
     * "A single instance of Node.js runs in a single thread. To take advantage of multi-core systems,
     * the user will sometimes want to launch a cluster of Node.js processes to handle the load.
     * The cluster module allows easy creation of child processes that all share server ports."
     *
     * We have the master node in the cluster run migrations and start workers.
     * The workers start express server processes
     */
    if (cluster.isMaster) {
      // run all migrations
      // this is a stupid solution to a timing bug, because migrations attempt to get run when
      // the db port is exposed, not when it's ready to accept incoming connections. the timeout
      // attempts to wait until the db is accepting connections
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await this.runMigrations()

      // clear POA & ETH relayer keys
      await Lock.clearAllLocks(generateWalletLockKey('*'))
      await Lock.clearAllLocks(generateETHWalletLockKey('*'))

      // if it's a non test run, fork web server worker processes
      if (!config.get('isTestRun')) {
        // Fork extra web server workers
        // note - we can't have more than 1 worker at the moment because POA and ETH relays
        // use in memory wallet locks
        for (let i = 0; i < config.get('clusterForkProcessCount'); i++) {
          cluster.fork({ WORKER_TYPE: 'web_server' })
        }

        cluster.on('exit', (worker) => {
          logger.info(
            `Cluster: Worker ${worker.process.pid} died, forking another worker`
          )
          cluster.fork(worker.process.env)
        })

        const audiusInstance = await this.configureAudiusInstance()

        await this.configureDiscoveryNodeRegistration(audiusInstance)
      } else {
        // if it's a test run only start the server
        await new Promise((resolve) => {
          server = this.express.listen(this.port, resolve)
        })
        server.setTimeout(config.get('setTimeout'))
        server.timeout = config.get('timeout')
        server.keepAliveTimeout = config.get('keepAliveTimeout')
        server.headersTimeout = config.get('headersTimeout')

        this.express.set('redis', this.redisClient)

        logger.info(`Listening on port ${this.port}...`)
      }

      try {
        await txRelay.fundRelayerIfEmpty()
      } catch (e) {
        logger.error(`Failed to fund relayer - ${e}`)
      }

      try {
        await ethTxRelay.fundEthRelayerIfEmpty()
      } catch (e) {
        logger.error(`Failed to fund L1 relayer - ${e}`)
      }

      return { app: this.express, server }
    } else {
      // if it's not the master worker in the cluster
      await this.configureAudiusInstance()

      await new Promise((resolve) => {
        server = this.express.listen(this.port, resolve)
      })
      server.setTimeout(config.get('setTimeout'))
      server.timeout = config.get('timeout')
      server.keepAliveTimeout = config.get('keepAliveTimeout')
      server.headersTimeout = config.get('headersTimeout')

      this.express.set('redis', this.redisClient)

      logger.info(`Listening on port ${this.port}...`)
      return { app: this.express, server }
    }
  }

  configureSendGrid() {
    // Configure sendgrid instance
    if (config.get('sendgridApiKey')) {
      sgMail.setApiKey(config.get('sendgridApiKey'))
      sgClient.setApiKey(config.get('sendgridApiKey'))
    }
    this.express.set('sendgrid', config.get('sendgridApiKey') ? sgMail : null)
    this.express.set(
      'sendgridClient',
      config.get('sendgridApiKey') ? sgClient : null
    )
  }

  configureOptimizely() {
    const sdkKey = config.get('optimizelySdkKey')
    const optimizelyClientInstance = optimizelySDK.createInstance({
      sdkKey,
      datafileOptions: {
        autoUpdate: true,
        updateInterval: 5000 // Poll for updates every 5s
      }
    })

    this.optimizelyPromise = new Promise((resolve) => {
      optimizelyClientInstance.onReady().then(() => {
        this.express.set('optimizelyClient', optimizelyClientInstance)

        resolve()
      })
    })
    return optimizelyClientInstance
  }

  async configureDiscoveryNodeRegistration(libs) {
    const childLogger = logger.child({ service: 'Discovery Node Registration' })
    await startRegistrationQueue(libs, childLogger)
  }

  async configureAudiusInstance() {
    await audiusLibsWrapper.init()
    const audiusInstance = audiusLibsWrapper.getAudiusLibs()
    this.express.set('audiusLibs', audiusInstance)
    return audiusInstance
  }

  async runMigrations() {
    logger.info('Executing database migrations...')
    try {
      await runMigrations()
    } catch (err) {
      logger.error('Error in migrations: ', err)
      process.exit(1)
    }
  }

  expressSettings() {
    // https://expressjs.com/en/guide/behind-proxies.html
    this.express.set('trust proxy', true)
  }

  setMiddleware() {
    this.express.use(loggingMiddleware)
    this.express.use(bodyParser.json({ limit: '1mb' }))
    this.express.use(cookieParser())
    this.express.use(cors())
  }

  setRateLimiters() {
    const authRequestRateLimiter = getRateLimiter({
      prefix: 'authLimiter',
      max: config.get('rateLimitingAuthLimit')
    })
    const otpRequestRateLimiter = getRateLimiter({
      prefix: 'otpLimiter',
      max: config.get('rateLimitingOtpLimit'),
      keyGenerator: (req) => {
        return `${req.query.email}:::${req.query.lookupKey}`
      },
      skip: (req) => {
        return !req.query.otp || req.query.otp === ''
      }
    })
    // This limiter double dips with the reqLimiter. The 5 requests every hour are also counted here
    this.express.use('/authentication/', authRequestRateLimiter)
    this.express.use('/authentication', otpRequestRateLimiter)

    const twitterRequestRateLimiter = getRateLimiter({
      prefix: 'twitterLimiter',
      max: config.get('rateLimitingTwitterLimit')
    })
    // This limiter double dips with the reqLimiter. The 5 requests every hour are also counted here
    this.express.use('/twitter/', twitterRequestRateLimiter)

    const tikTokRequestRateLimiter = getRateLimiter({
      prefix: 'tikTokLimiter',
      max: config.get('rateLimitingTikTokLimit')
    })
    // This limiter double dips with the reqLimiter. The 5 requests every hour are also counted here
    this.express.use('/tiktok/', tikTokRequestRateLimiter)

    // Eth relay rate limits
    // Default to 50 per ip per day and one of 10 per wallet per day
    const ONE_HOUR_IN_SECONDS = 60 * 60
    const ethRelayIPRateLimiter = getRateLimiter({
      prefix: 'ethRelayIPRateLimiter',
      expiry: ONE_HOUR_IN_SECONDS * 24,
      max: config.get('rateLimitingEthRelaysPerIPPerDay'),
      skip: function (req) {
        return isIPWhitelisted(req.ip, req)
      }
    })
    const ethRelayWalletRateLimiter = getRateLimiter({
      prefix: `ethRelayWalletRateLimiter`,
      expiry: ONE_HOUR_IN_SECONDS * 24,
      max: config.get('rateLimitingEthRelaysPerWalletPerDay'),
      skip: function (req) {
        return isIPWhitelisted(req.ip, req)
      },
      keyGenerator: function (req) {
        return req.body.senderAddress
      }
    })

    this.express.use(
      '/eth_relay',
      ethRelayWalletRateLimiter,
      ethRelayIPRateLimiter
    )

    this.express.use(
      '/relay',
      getRelayBlocklistMiddleware,
      getRelayRateLimiterMiddleware()
    )

    this.express.use(getRateLimiterMiddleware())
  }

  setRoutes() {
    // import routes
    require('./routes')(this.express)
  }

  setErrorHandler() {
    function errorHandler(err, req, res, next) {
      req.logger.error('Internal server error')
      req.logger.error(err.stack)
      sendResponse(req, res, errorResponseServerError('Internal server error'))
    }
    this.express.use(errorHandler)
  }
}

module.exports = App
