'use strict'

import { ethereumRouter } from './typed-routes/ethereum/ethRpc'

const path = require('path')
const { libs } = require('@audius/sdk-legacy/dist/libs')
const { loadAudiusSdk } = require(
  path.join(__dirname, '..', 'loadAudiusSdk.cjs')
)

const { setupTracing } = require('./tracer')
setupTracing()

const ON_DEATH = require('death')
const { sequelize } = require('./models')
const { logger } = require('./logging')
const config = require('./config')
const App = require('./app')

// Global handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason)
})

const start = async () => {
  const port = config.get('port')
  const app = new App(port)

  const environment = process.env.environment as
    | 'development'
    | 'production'
    | undefined
  logger.info('Starting SDK in environment:', environment)

  const { sdk } = await loadAudiusSdk()
  const audiusSdk = sdk({
    appName: 'identity-service',
    environment: environment ?? 'development'
  })
  app.express.set('audiusSdk', audiusSdk)

  app.express.use('/ethereum', ethereumRouter)
  const { server } = await app.init()

  ON_DEATH(() => {
    logger.info('Shutting down db and express app...')
    sequelize.close()
    server.close()
  })
}

start()
