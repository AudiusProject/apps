const { runMigrations, clearDatabase } = require('../../src/migrationManager')

async function getApp() {
  delete require.cache[require.resolve('../../src/app')] // force reload between each test
  const App = require('../../src/app')
  const config = require('../../src/config')
  config.set('isTestRun', true)
  const app = new App(8000)
  const server = await app.init()

  const captcha = {
    verify: () => {
      return {
        score: 0.88,
        ok: true,
        hostname: '/test'
      }
    }
  }
  const solanaWeb3Manager = {
    connection: null,
    solanaWeb3: {
      sendAndConfirmTransaction: () => {}
    }
  }
  const audiusLibs = { captcha, solanaWeb3Manager }

  const fpClient = {
    getVisitorHistory: async (visitorId) => {
      return {
        visitorId,
        visits: [
          {
            confidence: { score: 0.8 }, // arbitrary non-perfect score
            timestamp: Date.now(),
            tag: {
              origin: 'web'
            }
          }
        ]
      }
    }
  }

  server.app.set('audiusLibs', audiusLibs)
  server.app.set('fpClient', fpClient)

  // run all migrations before each test
  await clearDatabase()
  await runMigrations()

  return server
}

module.exports = { getApp, clearDatabase, runMigrations }
