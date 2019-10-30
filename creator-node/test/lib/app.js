const { runMigrations, clearDatabase } = require('../../src/migrationManager')
const config = require('../../src/config')

async function getApp (ipfsMock, libsMock, blacklistManager) {
  delete require.cache[require.resolve('../../src/app')] // force reload between each test
  delete require.cache[require.resolve('../../src/config')]
  delete require.cache[require.resolve('../../src/fileManager')]
  delete require.cache[require.resolve('../../src/blacklistManager')]
  delete require.cache[require.resolve('../../src/routes/tracks')]
  delete require.cache[require.resolve('../../src/routes/files')]

  // run all migrations before each test
  await clearDatabase()
  await runMigrations()

  const appInfo = require('../../src/app')(8000, config.get('storagePath'), ipfsMock, libsMock, blacklistManager)

  return appInfo
}

module.exports = { getApp }
