'use strict'

import { ethereumRouter } from './typed-routes/ethereum/ethRpc'
import { solanaRouter } from './typed-routes/solana/solanaRelay'
import { sdk } from '@audius/sdk'

// Import libs before anything else becaues it takes a very long time to load.
// Once it's imported once, it'll be in the cache and subsequent imports will be ~instant.
// This first import is slow but makes it easier to debug timing issues since no other code will be slowed down by importing it.
const { libs } = require('@audius/sdk-legacy/dist/libs')

const { setupTracing } = require('./tracer')
setupTracing()

const ON_DEATH = require('death')
const { sequelize } = require('./models')
const { logger } = require('./logging')
const config = require('./config')
const App = require('./app')

// Global handler for unhandled promise rejections
// TODO: We should remove this once we are confident no unhandled rejections are occurring
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason)
})

const start = async () => {
  const port = config.get('port')
  const app = new App(port)

  const environment = process.env.environment as
    | 'development'
    | 'staging'
    | 'production'
    | undefined
  logger.info('Starting SDK in environment:', environment)

  const audiusSdk = sdk({
    appName: 'identity-service',
    environment: environment ?? 'development'
  })
  app.express.set('audiusSdk', audiusSdk)

  // TODO: Move this into App once it's typed
  app.express.use('/solana', solanaRouter)
  app.express.use('/ethereum', ethereumRouter)
  const { server } = await app.init()

  // when app terminates, close down any open DB connections gracefully
  ON_DEATH(() => {
    // NOTE: log messages emitted here may be swallowed up if using the bunyan CLI (used by
    // default in `npm start` command). To see messages emitted after a kill signal, do not
    // use the bunyan CLI.
    logger.info('Shutting down db and express app...')
    sequelize.close()
    server.close()
  })
}

start()
