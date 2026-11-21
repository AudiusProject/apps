const { runMigrations, clearDatabase } = require('../../src/migrationManager')

async function getApp() {
  delete require.cache[require.resolve('../../src/app')]
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

  server.app.set('audiusLibs', audiusLibs)

  await clearDatabase()
  await runMigrations()

  return server
}

module.exports = { getApp, clearDatabase, runMigrations }
