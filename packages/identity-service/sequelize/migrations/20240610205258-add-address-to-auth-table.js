'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'Authentications',
        'walletAddress',
        {
          type: Sequelize.STRING,
          allowNull: true
        },
        { transaction }
      )

      await queryInterface.addIndex('Authentications', ['walletAddress'], {
        transaction,
        name: 'idx_authentications_walletAddress'
      })
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        'Authentications',
        'idx_authentications_walletAddress',
        { transaction }
      )
      await queryInterface.removeColumn('Authentications', 'walletAddress', {
        transaction
      })
    })
  }
}
