'use strict'
const models = require('../../src/models')

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query(
      'ALTER TYPE "enum_SolanaNotifications_type" ADD VALUE \'MilestoneListen\''
    )
  },
  down: (queryInterface, Sequelize) => {
    const tableName = 'SolanaNotifications'
    const columnName = 'type'
    const enumName = 'enum_SolanaNotifications_type'
    const newEnumName = `enum_SolanaNotifications_type_new`
    const prevValues = ['ChallengeReward']

    return queryInterface.sequelize.transaction(async (transaction) => {
      await models.Notification.destroy({
        where: { type: { [models.Sequelize.Op.in]: ['MilestoneListen'] } },
        transaction
      })

      await queryInterface.sequelize.query(
        `
        CREATE TYPE "${newEnumName}"
          AS ENUM ('${prevValues.join("', '")}')
        `,
        { transaction }
      )
      await queryInterface.sequelize.query(
        `
        ALTER TABLE "${tableName}"
        ALTER COLUMN ${columnName}
          TYPE "${newEnumName}"
          USING ("${columnName}"::text::"${newEnumName}")
      `,
        { transaction }
      )
      await queryInterface.sequelize.query(
        `
        DROP TYPE "${enumName}"
      `,
        { transaction }
      )
      await queryInterface.sequelize.query(
        `
        ALTER TYPE "${newEnumName}"
        RENAME TO "${enumName}"
      `,
        { transaction }
      )
    })
  }
}
