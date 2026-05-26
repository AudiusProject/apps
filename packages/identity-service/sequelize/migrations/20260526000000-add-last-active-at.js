'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'Users',
        'lastActiveAt',
        {
          type: Sequelize.DATE,
          allowNull: true
        },
        { transaction }
      )

      await queryInterface.addIndex('Users', ['lastActiveAt'], {
        transaction,
        name: 'idx_users_lastActiveAt'
      })
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('Users', 'idx_users_lastActiveAt', {
        transaction
      })
      await queryInterface.removeColumn('Users', 'lastActiveAt', {
        transaction
      })
    })
  }
}
