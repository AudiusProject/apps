const Umzug = require('umzug')
const path = require('path')

const { sequelize } = require('./models')

function runMigrations() {
  const umzug = new Umzug({
    storage: 'sequelize',

    storageOptions: {
      sequelize
    },

    migrations: {
      params: [sequelize.getQueryInterface(), sequelize.constructor],
      path: path.join(__dirname, '../sequelize/migrations')
    }
  })
  return umzug.up()
}

async function clearDatabase() {
  await sequelize.query('DROP SCHEMA IF EXISTS public CASCADE')
  await sequelize.query('CREATE SCHEMA public')
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      process.exit(0)
    })
    .catch(() => {
      console.error('error in running migrations')
      process.exit(1)
    })
}

module.exports = { runMigrations, clearDatabase }
