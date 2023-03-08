'use strict'

// Import libs before anything else becaues it takes a very long time to load.
// Once it's imported once, it'll be in the cache and subsequent imports will be ~instant.
// This first import is slow but makes it easier to debug timing issues since no other code will be slowed down by importing it.
const { libs } = require('@audius/sdk')

const { setupTracing } = require('./tracer')
setupTracing()

const ON_DEATH = require('death')
const { sequelize } = require('./models')
const { logger } = require('./logging')
const config = require('./config')
const App = require('./app')

const start = async () => {
  const port = config.get('port')
  const app = new App(port)
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
