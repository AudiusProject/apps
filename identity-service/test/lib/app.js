const { runMigrations, clearDatabase } = require('../../src/migrationManager')

async function getApp (s3bucket, ipfsMock) {
  delete require.cache[require.resolve('../../src/app')] // force reload between each test
  const App = require('../../src/app')
  const app = new App(8000)
  const server = await app.init()

  // run all migrations before each test
  await clearDatabase()
  await runMigrations()

  return server
}

module.exports = { getApp, clearDatabase, runMigrations }
