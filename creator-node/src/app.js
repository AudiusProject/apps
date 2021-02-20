const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const DiskManager = require('./diskManager')
const { sendResponse, errorResponseServerError } = require('./apiHelpers')
const { logger, loggingMiddleware } = require('./logging')
const { userNodeMiddleware } = require('./userNodeMiddleware')
const { readOnlyMiddleware } = require('./middlewares/readOnly/readOnlyMiddleware')
const {
  userReqLimiter,
  trackReqLimiter,
  audiusUserReqLimiter,
  metadataReqLimiter,
  imageReqLimiter,
  getRateLimiterMiddleware
} = require('./reqLimiter')
const config = require('./config')
const healthCheckRoutes = require('./components/healthCheck/healthCheckController')
const contentBlacklistRoutes = require('./components/contentBlacklist/contentBlacklistController')
const utils = require('./utils')

const app = express()
// middleware functions will be run in order they are added to the app below
//  - loggingMiddleware must be first to ensure proper error handling
app.use(loggingMiddleware)
app.use(bodyParser.json({ limit: '1mb' }))
app.use(userNodeMiddleware)
app.use(readOnlyMiddleware)
app.use(cors())

// Rate limit routes
app.use('/users/', userReqLimiter)
app.use('/track*', trackReqLimiter)
app.use('/audius_user/', audiusUserReqLimiter)
app.use('/metadata', metadataReqLimiter)
app.use('/image_upload', imageReqLimiter)
app.use(getRateLimiterMiddleware())

// import routes
require('./routes')(app)
app.use('/', healthCheckRoutes)
app.use('/', contentBlacklistRoutes)

function errorHandler (err, req, res, next) {
  req.logger.error('Internal server error')
  req.logger.error(err.stack)
  sendResponse(req, res, errorResponseServerError('Internal server error'))
}
app.use(errorHandler)

const initializeApp = async (port, serviceRegistry) => {
  const storagePath = DiskManager.getConfigStoragePath()

  // TODO: Can remove these when all routes
  // consume serviceRegistry
  app.set('ipfsAPI', serviceRegistry.ipfs)
  app.set('storagePath', storagePath)
  app.set('redisClient', serviceRegistry.redis)
  app.set('audiusLibs', serviceRegistry.audiusLibs)
  app.set('blacklistManager', serviceRegistry.blacklistManager)

  // add a newer version of ipfs as app property
  app.set('ipfsLatestAPI', serviceRegistry.ipfsLatest)

  // https://expressjs.com/en/guide/behind-proxies.html
  app.set('trust proxy', true)

  // TODOSID need to make sure this is awaited
  const server = app.listen(port, () => logger.info(`Listening on port ${port}...`))

  // Increase from 2min default to accommodate long-lived requests.
  server.setTimeout(config.get('setTimeout'))
  server.timeout = config.get('timeout')
  server.keepAliveTimeout = config.get('keepAliveTimeout')
  server.headersTimeout = config.get('headersTimeout')

  // initialize URSMService (requires server and /health_check to already be available)
  app.set('serviceRegistry', serviceRegistry)
  // await utils.timeout(1000)
  // console.info(`SIDTEST ABOUT TO RUN URSMSERVICE INIT`)
  // await serviceRegistry.URSMService.init()

  return { app: app, server: server }
}

module.exports = initializeApp
