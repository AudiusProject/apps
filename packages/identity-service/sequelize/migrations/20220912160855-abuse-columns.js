'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'Users',
        'isBlockedFromRelay',
        {
          type: Sequelize.BOOLEAN,
          allowNull: true
        },
        { transaction }
      )

      await queryInterface.addColumn(
        'Users',
        'isBlockedFromNotifications',
        {
          type: Sequelize.BOOLEAN,
          allowNull: true
        },
        { transaction }
      )

      await queryInterface.addColumn(
        'Users',
        'appliedRules',
        {
          type: Sequelize.JSONB,
          allowNull: true
        },
        { transaction }
      )

      await queryInterface.sequelize.query(
        'UPDATE "Users" SET "isBlockedFromRelay" = true WHERE "isAbusive" = true AND "isAbusiveErrorCode" != \'9\'',
        { transaction }
      )

      await queryInterface.sequelize.query(
        'UPDATE "Users" SET "isBlockedFromNotifications" = true WHERE "isAbusive" = true AND "isAbusiveErrorCode" = \'9\'',
        { transaction }
      )

      await queryInterface.removeColumn('Users', 'isAbusive', { transaction })
      await queryInterface.removeColumn('Users', 'isAbusiveErrorCode', {
        transaction
      })
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('Users', 'isBlockedFromRelay', {
        transaction
      })
      await queryInterface.removeColumn('Users', 'isBlockedFromNotifications', {
        transaction
      })
      await queryInterface.removeColumn('Users', 'appliedRules', {
        transaction
      })
      await queryInterface.addColumn('Users', 'isAbusive', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      })
      await queryInterface.addColumn('Users', 'isAbusiveErrorCode', {
        type: Sequelize.STRING
      })
    })
  }
}
